"""
Evaluation script for the UniVerse LoRA fine-tuned model.

Loads the fine-tuned adapter and runs inference on eval examples,
measuring:
  - Post categorization accuracy
  - Generation quality (perplexity proxy via eval loss)
  - Response latency

Can also compare base model vs. fine-tuned model side-by-side.

Usage:
    python evaluate.py                                   # evaluate fine-tuned
    python evaluate.py --compare                         # compare base vs fine-tuned
    python evaluate.py --model-path output/universe-lora # custom path
"""

import argparse
import json
import time
import logging
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
from sklearn.metrics import classification_report, accuracy_score

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_BASE = "Qwen/Qwen2.5-1.5B-Instruct"
DEFAULT_ADAPTER = "output/universe-lora"

VALID_CATEGORIES = {
    "academic", "research", "internship", "job",
    "housing", "event", "marketplace", "general",
}


def load_eval_data(path: str) -> list[dict]:
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))
    return records


def load_model(base_model: str, adapter_path: str | None = None):
    """Load base model optionally with a LoRA adapter."""
    tokenizer = AutoTokenizer.from_pretrained(
        base_model, trust_remote_code=True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )

    if adapter_path and Path(adapter_path).exists():
        logger.info("Loading LoRA adapter from: %s", adapter_path)
        model = PeftModel.from_pretrained(model, adapter_path)
        model = model.merge_and_unload()

    model.eval()
    return model, tokenizer


def generate_response(model, tokenizer, messages: list[dict], max_new_tokens: int = 64) -> str:
    """Generate a response given a messages list."""
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True,
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=0.1,
            do_sample=True,
            top_p=0.9,
            pad_token_id=tokenizer.pad_token_id,
        )

    generated = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(generated, skip_special_tokens=True).strip()


def extract_category(response: str) -> str:
    """Extract category from model response."""
    cleaned = response.strip().lower().split("\n")[0].strip(".- \"'`")
    if cleaned in VALID_CATEGORIES:
        return cleaned
    for cat in VALID_CATEGORIES:
        if cat in cleaned:
            return cat
    return "general"


def evaluate_categorization(model, tokenizer, examples: list[dict]) -> dict:
    """Evaluate post categorization accuracy."""
    cat_examples = [
        ex for ex in examples
        if "Categorize" in ex["messages"][0].get("content", "")
        or "Categorize" in ex["messages"][1].get("content", "")
    ]

    if not cat_examples:
        logger.warning("No categorization examples found in eval set")
        return {"accuracy": 0, "count": 0}

    y_true = []
    y_pred = []
    latencies = []

    for ex in cat_examples:
        expected = ex["messages"][-1]["content"].strip().lower()
        if expected not in VALID_CATEGORIES:
            continue

        prompt_messages = ex["messages"][:-1]

        start = time.time()
        response = generate_response(model, tokenizer, prompt_messages, max_new_tokens=10)
        latencies.append(time.time() - start)

        predicted = extract_category(response)
        y_true.append(expected)
        y_pred.append(predicted)

    accuracy = accuracy_score(y_true, y_pred) if y_true else 0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0

    logger.info("\n%s", classification_report(
        y_true, y_pred, labels=sorted(VALID_CATEGORIES), zero_division=0,
    ))

    return {
        "accuracy": round(accuracy, 4),
        "count": len(y_true),
        "avg_latency_ms": round(avg_latency * 1000, 1),
    }


def evaluate_generation_quality(model, tokenizer, examples: list[dict], n: int = 20) -> list[dict]:
    """Generate responses for a sample and return them for manual inspection."""
    non_cat = [
        ex for ex in examples
        if "Categorize" not in ex["messages"][1].get("content", "")
    ]

    sample = non_cat[:n]
    results = []

    for ex in sample:
        prompt_messages = ex["messages"][:-1]
        expected = ex["messages"][-1]["content"]

        start = time.time()
        generated = generate_response(model, tokenizer, prompt_messages, max_new_tokens=128)
        latency = time.time() - start

        results.append({
            "prompt": ex["messages"][1]["content"][:100],
            "expected": expected[:150],
            "generated": generated[:150],
            "latency_ms": round(latency * 1000, 1),
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="Evaluate UniVerse LoRA model")
    parser.add_argument("--base-model", default=DEFAULT_BASE)
    parser.add_argument("--model-path", default=DEFAULT_ADAPTER)
    parser.add_argument("--eval-data", default="data/eval.jsonl")
    parser.add_argument("--compare", action="store_true",
                        help="Compare base model vs fine-tuned")
    parser.add_argument("--output", default="eval_results.json",
                        help="Path to save evaluation results")
    args = parser.parse_args()

    eval_data = load_eval_data(args.eval_data)
    logger.info("Loaded %d eval examples", len(eval_data))

    results = {}

    if args.compare:
        # Evaluate base model
        logger.info("=== Evaluating BASE model ===")
        base_model, base_tok = load_model(args.base_model)
        results["base"] = {
            "categorization": evaluate_categorization(base_model, base_tok, eval_data),
            "samples": evaluate_generation_quality(base_model, base_tok, eval_data, n=5),
        }
        del base_model
        torch.cuda.empty_cache() if torch.cuda.is_available() else None

    # Evaluate fine-tuned model
    logger.info("=== Evaluating FINE-TUNED model ===")
    ft_model, ft_tok = load_model(args.base_model, args.model_path)
    results["fine_tuned"] = {
        "categorization": evaluate_categorization(ft_model, ft_tok, eval_data),
        "samples": evaluate_generation_quality(ft_model, ft_tok, eval_data, n=10),
    }

    # Save results
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    logger.info("Results saved to: %s", args.output)

    # Print summary
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)

    if "base" in results:
        base_acc = results["base"]["categorization"]["accuracy"]
        print(f"Base model categorization accuracy:       {base_acc:.1%}")

    ft_acc = results["fine_tuned"]["categorization"]["accuracy"]
    ft_lat = results["fine_tuned"]["categorization"]["avg_latency_ms"]
    print(f"Fine-tuned categorization accuracy:        {ft_acc:.1%}")
    print(f"Average inference latency:                 {ft_lat:.0f} ms")

    if "base" in results:
        improvement = ft_acc - results["base"]["categorization"]["accuracy"]
        print(f"Accuracy improvement:                     {improvement:+.1%}")

    print("=" * 60)


if __name__ == "__main__":
    main()
