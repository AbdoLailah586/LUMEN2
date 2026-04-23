import React from "react";

export const PricingPage: React.FC = () => {
    const handleCheckout = (planId: string) => {
        // Send request to backend Stripe Service
        console.log("Initiating checkout for: ", planId);
        alert(`Redirecting to Stripe Checkout for ${planId}...`);
    };

    const plans = [
        {
            id: "free",
            name: "Beginner",
            price: "Free",
            desc: "For individuals learning AutoML",
            features: ["50MB Dataset Limits", "Pandas Only Processing", "Basic ML Models (Sklearn)", "Community Support"],
            btnText: "Current Plan",
            color: "slate"
        },
        {
            id: "pro",
            name: "Professional",
            price: "$29",
            period: "/mo",
            desc: "For data scientists and researchers",
            features: ["1GB Dataset Limits", "Dask Distributed Support", "Deep Learning (Tabular + NLP)", "Basic Computer Vision", "Email Support"],
            btnText: "Upgrade to Pro",
            color: "blue",
            popular: true
        },
        {
            id: "team",
            name: "Enterprise",
            price: "Custom",
            desc: "For mission-critical deployments",
            features: ["Unlimited Dataset Bounds", "Apache Spark Cluster", "Full Custom Model Architecture", "Dedicated GPU Access", "24/7 SLA Support"],
            btnText: "Contact Sales",
            color: "indigo"
        }
    ];

    return (
        <div className="min-h-screen bg-[#050B14] py-20 px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h1 className="text-4xlmd:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-4">
                    Scale Your Intelligence
                </h1>
                <p className="text-lg text-slate-400">
                    Transparent pricing for pipelines of any scale. 
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        className={`relative rounded-3xl p-8 border ${plan.popular ? 'bg-slate-900 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.15)] transform md:-translate-y-4' : 'bg-slate-900/50 border-slate-800'}`}
                    >
                        {plan.popular && (
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                                Most Popular
                            </div>
                        )}
                        
                        <h3 className="text-xl font-semibold text-slate-200">{plan.name}</h3>
                        <p className="text-sm text-slate-400 mt-2 min-h-[40px]">{plan.desc}</p>
                        
                        <div className="my-6">
                            <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                            {plan.period && <span className="text-slate-500 font-medium"> {plan.period}</span>}
                        </div>
                        
                        <button 
                            onClick={() => handleCheckout(plan.id)}
                            className={`w-full py-3 rounded-xl font-bold transition-all ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                        >
                            {plan.btnText}
                        </button>
                        
                        <div className="mt-8 space-y-4">
                            {plan.features.map((feat, i) => (
                                <div key={i} className="flex items-start">
                                    <svg className={`w-5 h-5 mr-3 mt-0.5 ${plan.popular ? 'text-blue-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span className="text-sm text-slate-300">{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-20 max-w-4xl mx-auto text-center border-t border-slate-800 pt-10">
                <p className="text-slate-500 mb-4">Powered by secure Stripe processing.</p>
            </div>
        </div>
    );
};
