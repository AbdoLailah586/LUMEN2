"""
LUMEN CV Ensemble Engine — Model merging via voting, NMS, and IoU consensus.
"""
import numpy as np
from typing import Any, Dict, List, Optional
from collections import Counter


def majority_vote(predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Hard voting: each model's top prediction gets one vote."""
    votes = []
    for pred in predictions:
        top = pred.get("top_prediction") or (pred.get("predictions", [{}])[0] if pred.get("predictions") else {})
        if top:
            votes.append(top.get("class_id"))
    if not votes:
        return {"class_id": None, "confidence": 0.0, "method": "majority_vote"}
    counter = Counter(votes)
    winner, count = counter.most_common(1)[0]
    return {"class_id": winner, "confidence": round(count / len(votes), 4),
            "vote_count": count, "total_models": len(votes), "method": "majority_vote"}


def weighted_vote(predictions: List[Dict[str, Any]], weights: Optional[List[float]] = None) -> Dict[str, Any]:
    """Weighted voting by confidence or custom weights."""
    if weights is None:
        weights = []
        for pred in predictions:
            top = pred.get("top_prediction") or (pred.get("predictions", [{}])[0] if pred.get("predictions") else {})
            weights.append(top.get("confidence", 1.0) if top else 1.0)
    total_w = sum(weights) or 1.0
    weights = [w / total_w for w in weights]
    class_scores: Dict[int, float] = {}
    for pred, w in zip(predictions, weights):
        top = pred.get("top_prediction") or (pred.get("predictions", [{}])[0] if pred.get("predictions") else {})
        if top and top.get("class_id") is not None:
            cid = top["class_id"]
            class_scores[cid] = class_scores.get(cid, 0.0) + w
    if not class_scores:
        return {"class_id": None, "confidence": 0.0, "method": "weighted_vote"}
    winner = max(class_scores, key=class_scores.get)
    return {"class_id": winner, "confidence": round(class_scores[winner], 4),
            "all_scores": {str(k): round(v, 4) for k, v in class_scores.items()}, "method": "weighted_vote"}


def soft_vote(prob_distributions: List[np.ndarray]) -> Dict[str, Any]:
    """Average probability distributions from multiple models."""
    if not prob_distributions:
        return {"class_id": None, "confidence": 0.0, "method": "soft_vote"}
    max_len = max(len(p) for p in prob_distributions)
    padded = [np.pad(p, (0, max_len - len(p))) if len(p) < max_len else p for p in prob_distributions]
    avg_probs = np.mean(padded, axis=0)
    winner_idx = int(np.argmax(avg_probs))
    top5_idx = np.argsort(avg_probs)[::-1][:5]
    top5 = [{"class_id": int(i), "confidence": round(float(avg_probs[i]), 4)} for i in top5_idx]
    return {"class_id": winner_idx, "confidence": round(float(avg_probs[winner_idx]), 4),
            "top5": top5, "method": "soft_vote"}


def compute_iou(box_a: List[float], box_b: List[float]) -> float:
    """Compute IoU between two [x1, y1, x2, y2] boxes."""
    x1, y1 = max(box_a[0], box_b[0]), max(box_a[1], box_b[1])
    x2, y2 = min(box_a[2], box_b[2]), min(box_a[3], box_b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    union = (box_a[2]-box_a[0])*(box_a[3]-box_a[1]) + (box_b[2]-box_b[0])*(box_b[3]-box_b[1]) - inter
    return inter / union if union > 0 else 0.0


def iou_consensus(all_detections: List[List[Dict]], iou_threshold: float = 0.5, min_agree: int = 2) -> List[Dict]:
    """Keep detections where at least min_agree models agree (IoU > threshold, same class)."""
    flat = []
    for mi, dets in enumerate(all_detections):
        for d in dets:
            flat.append({**d, "_mi": mi})
    if not flat:
        return []
    by_cls: Dict[str, list] = {}
    for d in flat:
        k = str(d.get("class", d.get("class_id", "?")))
        by_cls.setdefault(k, []).append(d)
    results = []
    for cls_key, dets in by_cls.items():
        for i, di in enumerate(dets):
            agreeing = {di["_mi"]}
            confs = [di.get("confidence", 0)]
            for j, dj in enumerate(dets):
                if i == j or dj["_mi"] == di["_mi"]:
                    continue
                if compute_iou(di.get("bbox", [0,0,0,0]), dj.get("bbox", [0,0,0,0])) >= iou_threshold:
                    agreeing.add(dj["_mi"])
                    confs.append(dj.get("confidence", 0))
            if len(agreeing) >= min_agree:
                results.append({"class": cls_key, "confidence": round(float(np.mean(confs)), 4),
                                "bbox": di.get("bbox"), "agreed_models": len(agreeing), "method": "iou_consensus"})
    return _dedup(results, iou_threshold)


def nms_merge(all_detections: List[List[Dict]], iou_threshold: float = 0.5) -> List[Dict]:
    """Non-Maximum Suppression across all models' detections."""
    flat = [d for dets in all_detections for d in dets]
    if not flat:
        return []
    by_cls: Dict[str, list] = {}
    for d in flat:
        k = str(d.get("class", d.get("class_id", "?")))
        by_cls.setdefault(k, []).append(d)
    merged = []
    for cls_key, dets in by_cls.items():
        dets.sort(key=lambda x: x.get("confidence", 0), reverse=True)
        suppressed = set()
        for i, di in enumerate(dets):
            if i in suppressed:
                continue
            merged.append({**di, "method": "nms_merge"})
            for j in range(i+1, len(dets)):
                if j not in suppressed and compute_iou(di.get("bbox",[0,0,0,0]), dets[j].get("bbox",[0,0,0,0])) >= iou_threshold:
                    suppressed.add(j)
    return merged


def _dedup(detections: List[Dict], iou_thr: float = 0.5) -> List[Dict]:
    detections.sort(key=lambda d: d.get("confidence", 0), reverse=True)
    keep = []
    for d in detections:
        if not any(d.get("class") == k.get("class") and compute_iou(d.get("bbox",[0,0,0,0]), k.get("bbox",[0,0,0,0])) >= iou_thr for k in keep):
            keep.append(d)
    return keep


def run_ensemble(model_results: List[Dict], strategy: str = "majority_vote",
                 task_type: str = "classification", weights: Optional[List[float]] = None,
                 prob_distributions: Optional[List[np.ndarray]] = None) -> Dict[str, Any]:
    """High-level ensemble runner."""
    result = {"strategy": strategy, "task_type": task_type, "num_models": len(model_results), "per_model_results": model_results}
    if task_type == "classification":
        if strategy == "weighted_vote":
            result["ensemble_result"] = weighted_vote(model_results, weights)
        elif strategy == "soft_vote" and prob_distributions:
            result["ensemble_result"] = soft_vote(prob_distributions)
        else:
            result["ensemble_result"] = majority_vote(model_results)
    elif task_type == "detection":
        all_dets = [r.get("detections", []) for r in model_results]
        if strategy == "iou_consensus":
            result["ensemble_result"] = {"detections": iou_consensus(all_dets), "method": "iou_consensus"}
        else:
            result["ensemble_result"] = {"detections": nms_merge(all_dets), "method": "nms_merge"}
    return result
