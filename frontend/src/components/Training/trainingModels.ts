export interface TrainingModelOption {
    id: string;
    name: string;
    desc: string;
    icon: string;
    category: "tree" | "linear" | "other";
}

export const TRAINING_MODELS: TrainingModelOption[] = [
    { id: "XGBoost", name: "XGBoost", desc: "Extreme Gradient Boosting", icon: "⚡", category: "tree" },
    { id: "LightGBM", name: "LightGBM", desc: "Fast histogram-based boosting", icon: "🚀", category: "tree" },
    { id: "CatBoost", name: "CatBoost", desc: "Categorical-aware boosting", icon: "🐱", category: "tree" },
    { id: "RandomForest", name: "Random Forest", desc: "Robust bagging ensemble", icon: "🌲", category: "tree" },
    { id: "GradientBoosting", name: "Gradient Boosting", desc: "Sklearn gradient boosting", icon: "📈", category: "tree" },
    { id: "ExtraTrees", name: "Extra Trees", desc: "Extremely randomized trees", icon: "🌳", category: "tree" },
    { id: "LogisticRegression", name: "Logistic Regression", desc: "Fast linear classifier", icon: "📐", category: "linear" },
    { id: "SVM", name: "Support Vector Machine", desc: "Kernel-based classifier", icon: "🎯", category: "other" },
    { id: "KNeighbors", name: "K-Nearest Neighbors", desc: "Instance-based learning", icon: "🔵", category: "other" },
];
