"""
LoRA fine-tuning script for UniVerse domain adaptation.

Fine-tunes Qwen2.5-1.5B-Instruct using LoRA (Low-Rank Adaptation)
on synthetic university social network data for three tasks:
  - Community recommendation
  - Job-student matching
  - Post categorization

Usage:
    python train.py                          # defaults
    python train.py --epochs 5 --lr 2e-4     # custom params
    python train.py --base-model Qwen/Qwen2.5-0.5B-Instruct  # smaller model
"""

import argparse
import json
import logging
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"


def load_dataset(path: str) -> Dataset:
    """Load a JSONL chat dataset."""
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))
    return Dataset.from_list(records)


def format_chat(example: dict, tokenizer) -> str:
    """Apply the model's chat template to a messages list."""
    return tokenizer.apply_chat_template(
        example["messages"], tokenize=False, add_generation_prompt=False,
    )


def main():
    parser = argparse.ArgumentParser(description="LoRA fine-tuning for UniVerse")
    parser.add_argument("--base-model", default=DEFAULT_MODEL, help="HuggingFace model ID")
    parser.add_argument("--train-data", default="data/train.jsonl")
    parser.add_argument("--eval-data", default="data/eval.jsonl")
    parser.add_argument("--output-dir", default="output/universe-lora")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-seq-len", type=int, default=512)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--fp16", action="store_true", default=False)
    parser.add_argument("--bf16", action="store_true", default=False)
    args = parser.parse_args()

    # Auto-detect precision
    if not args.fp16 and not args.bf16:
        if torch.cuda.is_available():
            args.fp16 = True
            logger.info("Using fp16 (recommended for QLoRA)")

    # ── Load tokenizer and model ───────────────────────────────

    logger.info("Loading model: %s", args.base_model)

    tokenizer = AutoTokenizer.from_pretrained(
        args.base_model, trust_remote_code=True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model.config.use_cache = False

    # ── LoRA configuration ─────────────────────────────────────

    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                         "gate_proj", "up_proj", "down_proj"],
        bias="none",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # ── Load datasets ──────────────────────────────────────────

    logger.info("Loading datasets")
    train_dataset = load_dataset(args.train_data)
    eval_dataset = load_dataset(args.eval_data)

    logger.info("Train: %d examples, Eval: %d examples",
                len(train_dataset), len(eval_dataset))

    # ── Training arguments ─────────────────────────────────────

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        weight_decay=0.01,
        warmup_ratio=0.03,
        max_grad_norm=1.0,
        lr_scheduler_type="cosine",
        fp16=args.fp16,
        bf16=args.bf16,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        optim="paged_adamw_8bit",
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=50,
        save_strategy="steps",
        save_steps=50,
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        report_to="none",
        seed=42,
        dataloader_pin_memory=True,
    )

    # ── Trainer ────────────────────────────────────────────────

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        processing_class=tokenizer,
    )

    # ── Train ──────────────────────────────────────────────────

    logger.info("Starting training...")
    train_result = trainer.train()
    logger.info("Training complete!")

    # ── Save ───────────────────────────────────────────────────

    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    # Save training metrics
    metrics = train_result.metrics
    metrics["train_samples"] = len(train_dataset)
    trainer.log_metrics("train", metrics)
    trainer.save_metrics("train", metrics)
    trainer.save_state()

    # Evaluate
    eval_metrics = trainer.evaluate()
    eval_metrics["eval_samples"] = len(eval_dataset)
    trainer.log_metrics("eval", eval_metrics)
    trainer.save_metrics("eval", eval_metrics)

    logger.info("Model saved to: %s", args.output_dir)
    logger.info("Train loss: %.4f", metrics.get("train_loss", -1))
    logger.info("Eval loss: %.4f", eval_metrics.get("eval_loss", -1))


if __name__ == "__main__":
    main()
