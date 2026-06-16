# UniVerse LoRA Fine-Tuning Demo

Academic demonstration of domain adaptation using LoRA (Low-Rank Adaptation)
for a university social network recommendation system.

## Base Model

**Qwen2.5-1.5B-Instruct** — a compact 1.5-billion-parameter instruction-tuned
language model from Alibaba's Qwen team. Chosen for:

- Small enough to fine-tune on a single consumer GPU (6 GB+ VRAM)
- Strong instruction-following capability out of the box
- No gated access required (unlike Llama)
- Chat template support for multi-turn conversations

## LoRA Configuration

| Parameter       | Value                                              |
|-----------------|----------------------------------------------------|
| Rank (r)        | 16                                                 |
| Alpha           | 32                                                 |
| Dropout         | 0.05                                               |
| Target modules  | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Trainable params| ~6.8M (~0.45% of 1.5B)                            |
| Task type       | CAUSAL_LM                                          |

LoRA injects low-rank decomposition matrices into the attention and MLP
layers. Only these adapter weights are trained — the base model is frozen.
This reduces memory usage by ~75% compared to full fine-tuning.

## Training Parameters

| Parameter                | Value         |
|--------------------------|---------------|
| Epochs                   | 3             |
| Batch size               | 4             |
| Gradient accumulation    | 4 (effective batch = 16) |
| Learning rate            | 2e-4          |
| LR scheduler             | Cosine        |
| Warmup ratio             | 10%           |
| Weight decay             | 0.01          |
| Max sequence length      | 512 tokens    |
| Precision                | bf16 (auto)   |
| Optimizer                | AdamW         |

## Dataset

Synthetically generated from UniVerse domain data across three tasks:

| Task                     | Train | Eval | Description                           |
|--------------------------|-------|------|---------------------------------------|
| Community recommendation | 174   | 26   | Suggest communities based on interests |
| Job-student matching     | 170   | 30   | Assess fit between student and job    |
| Post categorization      | 166   | 34   | Classify posts into 8 categories      |
| **Total**                | **510** | **90** |                                    |

### Data format

Chat-template JSONL with system, user, and assistant messages:

```json
{
  "messages": [
    {"role": "system", "content": "You are UniVerse, a university social network assistant..."},
    {"role": "user", "content": "A student in Computer Science is interested in: machine learning..."},
    {"role": "assistant", "content": "- **AI & Machine Learning**: ..."}
  ]
}
```

### Categories (Post Categorization)

| Category    | Description                                    |
|-------------|------------------------------------------------|
| academic    | Coursework, study groups, exams, lectures      |
| research    | Papers, lab work, thesis, research projects    |
| internship  | Internship openings and experiences            |
| job         | Full-time/part-time positions, career          |
| housing     | Apartments, roommates, dorms, subletting       |
| event       | Meetups, hackathons, campus events             |
| marketplace | Buying, selling, trading items                 |
| general     | Everything else                                |

## Project Structure

```
lora-demo/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── generate_dataset.py    # Synthetic data generator
├── train.py               # LoRA fine-tuning script
├── evaluate.py            # Evaluation and comparison script
└── data/
    ├── train.jsonl         # 510 training examples
    └── eval.jsonl          # 90 evaluation examples
```

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/macOS
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Generate dataset (already included, but can regenerate)
python generate_dataset.py
```

## Training

```bash
# Default configuration (Qwen2.5-1.5B, 3 epochs)
python train.py

# Custom parameters
python train.py --epochs 5 --lr 1e-4 --lora-r 32 --lora-alpha 64

# Smaller model for limited hardware
python train.py --base-model Qwen/Qwen2.5-0.5B-Instruct --batch-size 8
```

Training time: ~15-30 minutes on a single GPU (RTX 3060+).
Memory: ~6 GB VRAM with bf16 precision.

## Evaluation

```bash
# Evaluate fine-tuned model
python evaluate.py

# Compare base model vs fine-tuned (side-by-side)
python evaluate.py --compare

# Custom model path
python evaluate.py --model-path output/universe-lora --output results.json
```

The evaluation script measures:
- **Categorization accuracy**: exact-match on post categories
- **Per-category precision/recall**: via sklearn classification report
- **Inference latency**: average response time in milliseconds
- **Generation samples**: side-by-side comparison for manual inspection

## Expected Results

| Metric                   | Base Model | Fine-Tuned | Notes                |
|--------------------------|------------|------------|----------------------|
| Categorization accuracy  | ~40-50%    | ~75-85%    | Domain-specific gain |
| Avg inference latency    | ~200ms     | ~200ms     | Same architecture    |
| Trainable parameters     | 1.5B       | 6.8M       | 0.45% of total       |

> These are estimated ranges for a demonstration. Actual results depend on
> hardware, random seeds, and training duration.

## Technical Details

### Why LoRA?

Full fine-tuning of even a 1.5B model requires 12+ GB VRAM and modifies all
parameters. LoRA achieves comparable task-specific performance by only
training low-rank decomposition matrices (A and B) injected into each
attention layer:

```
W' = W + BA    where B ∈ R^(d×r), A ∈ R^(r×d), r << d
```

With r=16 and d=1536 (Qwen2.5-1.5B hidden size), each adapter layer has
only 2 × 16 × 1536 = 49,152 parameters instead of 1536² = 2,359,296.

### Why synthetic data?

For an academic demo, synthetic data provides:
1. Full control over distribution and balance
2. No privacy concerns with real user data
3. Reproducible results across runs
4. Clear ground-truth labels for evaluation

### Libraries Used

- **transformers** (HuggingFace): Model loading and tokenization
- **peft**: Parameter-Efficient Fine-Tuning (LoRA implementation)
- **trl**: Supervised Fine-Tuning Trainer (SFTTrainer)
- **datasets**: Dataset loading and processing
- **accelerate**: Multi-GPU and mixed-precision training
- **bitsandbytes**: 4/8-bit quantization support
- **scikit-learn**: Evaluation metrics

## Disclaimer

This is an academic demonstration project. The fine-tuned model is not
intended for production use. The synthetic dataset does not contain real
user data.
