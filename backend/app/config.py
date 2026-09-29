from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]

def _resolve_artifact_dir() -> Path:
    env_dir = os.environ.get("AURA_ARTIFACT_DIR")
    if env_dir and Path(env_dir).exists():
        return Path(env_dir)
    candidates = [
        ROOT / "ml_artifacts",
        Path.cwd() / "ml_artifacts",
        Path(__file__).resolve().parent.parent.parent / "ml_artifacts",
        Path("/var/task/ml_artifacts"),
        ROOT / "Hybrid-AI-NWP" / "ml_artifacts",
        Path.cwd() / "Hybrid-AI-NWP" / "ml_artifacts",
        Path("/var/task/Hybrid-AI-NWP/ml_artifacts"),
    ]
    for c in candidates:
        if c.exists() and (c / "locked_test_outputs.npz").exists():
            return c
    return ROOT / "ml_artifacts"

ARTIFACT_DIR = _resolve_artifact_dir()
CKPT_PATH = ARTIFACT_DIR / "aura_blend_sdw_net.pt"
NPZ_PATH = ARTIFACT_DIR / "locked_test_outputs.npz"
METRICS_PATH = ARTIFACT_DIR / "final_metrics.csv"
ABLATION_PATH = ARTIFACT_DIR / "ablation_results.csv"
RUN_METADATA_PATH = ARTIFACT_DIR / "run_metadata.json"