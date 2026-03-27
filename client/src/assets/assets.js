import blog_pic_1 from './blog_pic_1.png';
import blog_pic_2 from './blog_pic_2.png';
import blog_pic_3 from './blog_pic_3.png';
import blog_pic_4 from './blog_pic_4.png';
import blog_pic_5 from './blog_pic_5.png';
import blog_pic_6 from './blog_pic_6.png';
import blog_pic_7 from './blog_pic_7.png';
import blog_pic_8 from './blog_pic_8.png';
import blog_pic_9 from './blog_pic_9.png';
import blog_pic_10 from './blog_pic_10.png';
import facebook_icon from './facebook_icon.svg'
import googleplus_icon from './googleplus_icon.svg'
import twitter_icon from './twitter_icon.svg'
import logo from './logo.svg'
import arrow from './arrow.svg'
import logo_light from './logo_light.svg'
import blog_icon from './blog_icon.png'
import add_icon from './add_icon.svg'
import list_icon from './list_icon.svg'
import email_icon from './email_icon.png'
import upload_area from './upload_area.svg'
import user_icon from './user_icon.svg'
import bin_icon from './bin_icon.svg'
import comment_icon from './comment_icon.svg'
import tick_icon from './tick_icon.svg'
import star_icon from './star_icon.svg'
import cross_icon from './cross_icon.svg'
import home_icon from './home_icon.svg'
import gradientBackground from './gradientBackground.png'
import dashboard_icon_1 from './dashboard_icon_1.svg'
import dashboard_icon_2 from './dashboard_icon_2.svg'
import dashboard_icon_3 from './dashboard_icon_3.svg'
import dashboard_icon_4 from './dashboard_icon_4.svg'


export const assets = {
    facebook_icon,
    googleplus_icon,
    twitter_icon,
    logo,
    arrow,
    logo_light,
    blog_icon,
    add_icon,
    email_icon,
    upload_area,
    user_icon,
    bin_icon,
    comment_icon,
    tick_icon,
    star_icon,
    home_icon,
    gradientBackground,
    list_icon,
    cross_icon,
    dashboard_icon_1,
    dashboard_icon_2,
    dashboard_icon_3,
    dashboard_icon_4,
    blog_pic_1,
    blog_pic_2,
    blog_pic_3,
    blog_pic_4,
    blog_pic_5,
    blog_pic_6,
    blog_pic_7,
    blog_pic_8,
    blog_pic_9,
    blog_pic_10,
}

export const blogIllustrations = {
  '/src/assets/blog_pic_1.png': blog_pic_1,
  '/src/assets/blog_pic_2.png': blog_pic_2,
  '/src/assets/blog_pic_3.png': blog_pic_3,
  '/src/assets/blog_pic_4.png': blog_pic_4,
  '/src/assets/blog_pic_5.png': blog_pic_5,
  '/src/assets/blog_pic_6.png': blog_pic_6,
  '/src/assets/blog_pic_7.png': blog_pic_7,
  '/src/assets/blog_pic_8.png': blog_pic_8,
  '/src/assets/blog_pic_9.png': blog_pic_9,
  '/src/assets/blog_pic_10.png': blog_pic_10,
  'blog_pic_1.png': blog_pic_1,
  'blog_pic_2.png': blog_pic_2,
  'blog_pic_3.png': blog_pic_3,
  'blog_pic_4.png': blog_pic_4,
  'blog_pic_5.png': blog_pic_5,
  'blog_pic_6.png': blog_pic_6,
  'blog_pic_7.png': blog_pic_7,
  'blog_pic_8.png': blog_pic_8,
  'blog_pic_9.png': blog_pic_9,
  'blog_pic_10.png': blog_pic_10,
}

export const blogIllustrationList = Object.values(blogIllustrations)
export const blogCategories = ['All', 'Deep Dives', 'Case Studies', 'The Stack', 'Industry Trends']

export const blog_data = [
  // =========================
  // DEEP DIVES (3 POSTS)
  // =========================
  {
    "_id": "675f1a01a3b4c9f0a1b2c301",
    "title": "How Deep Learning Models Actually Learn: Gradients, Loss, and Optimization",
    "description": "<h1>How Deep Learning Models Actually Learn: Gradients, Loss, and Optimization</h1><p>Deep learning models may look like magic from the outside, but under the hood they are powered by relatively simple mathematical ideas: loss functions, gradients, and iterative optimization. Understanding these concepts is essential if you want to go beyond plug-and-play modeling and start debugging, improving, or designing your own architectures.</p><h2>1. The Role of the Loss Function</h2><p>The loss function measures how far your model’s predictions are from the true labels. For classification, this is often cross-entropy; for regression, mean squared error is common. During training, the optimizer tries to find parameter values (weights and biases) that minimize this loss over the training set.</p><h2>2. Gradients and Backpropagation</h2><p>Gradients tell us how much the loss would change if we nudge each parameter slightly. Backpropagation efficiently computes these gradients layer by layer using the chain rule from calculus. This allows us to update millions of parameters using a single pass through the network.</p><h2>3. Optimization Algorithms</h2><p>Stochastic gradient descent (SGD) and its variants (like Adam, RMSProp, and momentum-based methods) use these gradients to iteratively update parameters. They balance learning speed with stability, helping the model converge to a good region of the loss landscape rather than diverging or getting stuck too early.</p><h2>4. Learning Rate, Batch Size, and Regularization</h2><p>The learning rate controls the step size of each update, while batch size affects the noise in gradient estimates. Regularization techniques such as weight decay, dropout, and early stopping help prevent overfitting and improve generalization to unseen data.</p><h2>5. Why This Matters in Practice</h2><p>When a model fails to converge, overfits badly, or learns very slowly, understanding gradients and optimization helps you debug issues: adjusting the learning rate, changing the loss, or refining the architecture can often fix the problem without collecting more data.</p><p><strong>Takeaway:</strong> Deep learning is not a black box. Once you understand loss, gradients, and optimization, you gain real control over how your models learn and behave in production settings.</p>",
    "category": "Deep Dives",
    "image": blog_pic_1,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "A practical walkthrough of how deep learning models actually learn"
  },
  {
    "_id": "675f1a01a3b4c9f0a1b2c302",
    "title": "Interpreting Black-Box Models: SHAP, LIME, and Model Explainability",
    "description": "<h1>Interpreting Black-Box Models: SHAP, LIME, and Model Explainability</h1><p>As machine learning systems move into high-stakes domains like healthcare, finance, and education, model explainability is no longer optional. Stakeholders increasingly ask not only <em>what</em> the model predicts, but <em>why</em> it made that prediction. This is where post-hoc explanation techniques such as SHAP and LIME become essential.</p><h2>1. Why Explainability Matters</h2><p>Explainability supports trust, accountability, and debugging. It helps detect bias, identify spurious correlations, and communicate model behavior to non-technical decision-makers. In regulated industries, explainability is often a legal requirement, not just a nice-to-have feature.</p><h2>2. Local vs Global Explanations</h2><p>Global explanations describe overall model behavior (for example, feature importance across the whole dataset), while local explanations describe why the model made a specific prediction for a single instance. SHAP and LIME primarily focus on local explanations.</p><h2>3. LIME: Local Interpretable Model-Agnostic Explanations</h2><p>LIME creates a simple, interpretable surrogate model (such as a small linear model) around the neighborhood of a single prediction. By perturbing inputs and observing how predictions change, it estimates which features contributed most strongly to the output locally.</p><h2>4. SHAP: Shapley Additive Explanations</h2><p>SHAP uses ideas from cooperative game theory to assign each feature a fair contribution to the prediction. It has strong theoretical foundations and produces additive explanations that are consistent across samples. Many modern frameworks now include native SHAP support.</p><h2>5. Practical Considerations</h2><p>Explanations are approximations. They can be misleading if the underlying data is biased or if the model behaves non-smoothly in certain regions. It is good practice to combine multiple explanation methods, sanity-check results with domain experts, and avoid using explanations purely for persuasive storytelling.</p><p><strong>Takeaway:</strong> Explainability tools like SHAP and LIME provide powerful lenses into black-box models, but they must be used thoughtfully, in combination with strong evaluation and domain expertise.</p>",
    "category": "Deep Dives",
    "image": blog_pic_2,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "Making black-box ML models more transparent and trustworthy"
  },
  {
    "_id": "675f1a01a3b4c9f0a1b2c303",
    "title": "Evaluating Classification Models Beyond Accuracy: Precision, Recall, F1, and Calibration",
    "description": "<h1>Evaluating Classification Models Beyond Accuracy: Precision, Recall, F1, and Calibration</h1><p>Accuracy alone is rarely enough to judge a classifier, especially when classes are imbalanced or errors have asymmetric costs. Modern ML practice relies on a richer toolkit of evaluation metrics to understand model behavior across thresholds and decision contexts.</p><h2>1. The Limits of Accuracy</h2><p>In imbalanced datasets, a model that always predicts the majority class can achieve high accuracy while being useless in practice. For example, predicting that no one will churn or that no transaction is fraudulent may yield good accuracy but zero business value.</p><h2>2. Precision and Recall</h2><p>Precision answers, “Of the instances predicted positive, how many were actually positive?” Recall answers, “Of the true positives in the data, how many did the model correctly identify?” Tuning the decision threshold often involves trading off precision against recall depending on domain priorities.</p><h2>3. F1-Score and Other Summary Metrics</h2><p>The F1-score is the harmonic mean of precision and recall, giving a single number that balances both. For multi-class problems, macro- and weighted-averaged F1-scores help summarize performance while respecting class structure.</p><h2>4. ROC, AUC, and PR Curves</h2><p>Receiver operating characteristic (ROC) curves and precision-recall (PR) curves show performance across all thresholds rather than at a single cut point. AUC (area under the curve) provides a threshold-independent measure of ranking quality.</p><h2>5. Calibration and Real-World Decision-Making</h2><p>Well-calibrated models produce probabilities that reflect real-world frequencies. In many applications—risk scoring, triage, resource allocation—probability calibration matters as much as discrimination. Techniques such as Platt scaling and isotonic regression can improve calibration post-hoc.</p><p><strong>Takeaway:</strong> Robust model evaluation in production requires looking beyond accuracy to threshold-sensitive metrics, calibration, and domain-specific costs of false positives and false negatives.</p>",
    "category": "Deep Dives",
    "image": blog_pic_3,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "Why real ML evaluation always goes beyond plain accuracy"
  },

  // =========================
  // CASE STUDIES (3 POSTS)
  // =========================
  {
    "_id": "675f1a01a3b4c9f0a1b2c304",
    "title": "Case Study: Predicting Customer Churn in Telecommunications",
    "description": "<h1>Case Study: Predicting Customer Churn in Telecommunications</h1><p>Customer churn is one of the most common and impactful use cases for applied machine learning. In subscription businesses like telecommunications, even a small reduction in churn can translate into significant recurring revenue gains.</p><h2>1. Business Problem and Objectives</h2><p>The goal is to identify customers who are likely to cancel their service in the near future, allowing the retention team to intervene with targeted offers or improved support. A good churn model prioritizes recall for high-value customers while keeping outreach costs under control.</p><h2>2. Data Sources and Features</h2><p>Typical features include contract type, tenure, billing history, service usage patterns, payment methods, prior complaints, and customer demographics (where allowed). Feature engineering may include aggregations over time windows, ratios, trend features, and interaction terms.</p><h2>3. Modeling Approach</h2><p>Gradient-boosted decision trees (such as XGBoost, LightGBM, or CatBoost) are widely used for churn because they handle heterogeneous tabular data, non-linear relationships, and missing values well. Cross-validation and careful hyperparameter tuning help prevent overfitting.</p><h2>4. Evaluation and Uplift</h2><p>The model is evaluated using precision, recall, F1-score, ROC-AUC, and gains or lift charts. In practice, the business cares about incremental revenue: how many at-risk customers can be saved compared with existing targeting strategies. This is often evaluated via A/B tests or uplift modeling.</p><h2>5. Deployment and Monitoring</h2><p>The model is deployed as an API that scores customers on a regular schedule (for example, daily or weekly). Monitoring includes data drift, performance drift, and operational metrics such as how many high-risk customers actually churned despite interventions.</p><p><strong>Takeaway:</strong> Churn prediction succeeds when the ML model, retention strategy, and measurement plan are tightly aligned with business goals—not just when the AUC looks good in a notebook.</p>",
    "category": "Case Studies",
    "image": blog_pic_4,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "A practical end-to-end churn modeling example from data to deployment"
  },
  {
    "_id": "675f1a01a3b4c9f0a1b2c305",
    "title": "Case Study: Time Series Demand Forecasting for Retail",
    "description": "<h1>Case Study: Time Series Demand Forecasting for Retail</h1><p>Accurate demand forecasting helps retailers reduce stockouts, avoid overstocking, and improve margins. Modern approaches combine classical time series modeling with machine learning on rich, event-level data.</p><h2>1. Problem Setup</h2><p>The task is to predict daily or weekly demand for products at specific locations. Forecasts support decisions in ordering, allocation, and staffing. The challenge lies in seasonality, promotions, holidays, and external shocks that shape demand patterns.</p><h2>2. Feature Engineering</h2><p>Beyond raw sales history, useful features include calendar effects (day of week, holidays), price and promotion flags, competitor or market data where available, and lag features capturing short- and long-term history. Aggregating features at different levels (product, category, store, region) can also improve generalization.</p><h2>3. Modeling Techniques</h2><p>Approaches range from ARIMA and exponential smoothing to gradient boosting and deep learning (for example, sequence models like LSTMs or transformer-based time series architectures). Often, a global model trained across many series can outperform separate models per SKU.</p><h2>4. Evaluation and Hierarchies</h2><p>Metrics like MAE, RMSE, MAPE, and weighted variants are used to evaluate forecasts. In hierarchical settings (SKU → category → total), forecasts should be coherent across levels. Post-processing or specialized models can enforce this coherence.</p><h2>5. Deployment and Feedback Loops</h2><p>Forecasts are generated on a regular cadence (daily or weekly) and consumed by planning systems. Continuous monitoring looks for regime shifts, such as new product launches or macroeconomic changes, and triggers model recalibration when needed.</p><p><strong>Takeaway:</strong> Effective demand forecasting blends strong time series fundamentals with modern ML, careful feature engineering, and close collaboration with planners and merchandisers.</p>",
    "category": "Case Studies",
    "image": blog_pic_5,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "How retailers use machine learning to predict and plan demand"
  },
  {
    "_id": "675f1a01a3b4c9f0a1b2c306",
    "title": "Case Study: Using NLP to Classify and Route Support Tickets",
    "description": "<h1>Case Study: Using NLP to Classify and Route Support Tickets</h1><p>Support teams in large organizations handle thousands of tickets per day. Automatically classifying tickets by topic, urgency, or required team can reduce response times and improve customer satisfaction.</p><h2>1. Data and Label Design</h2><p>Support tickets usually contain free-text descriptions, optional titles, and metadata like product, channel, or customer segment. Labels might include issue category, responsible team, or severity level. Designing a clean, consistent label taxonomy is often the hardest part.</p><h2>2. Baseline Models and Embeddings</h2><p>Initial models often use TF-IDF features with linear classifiers. Modern systems increasingly rely on pretrained language models (such as BERT-style encoders) to generate contextual embeddings for tickets, which feed into a classifier head.</p><h2>3. Handling Imbalanced and Evolving Classes</h2><p>Some categories receive many more tickets than others. Techniques like class weighting, focal loss, and data augmentation can help. Over time, new issue types emerge, requiring periodic relabeling and model updates to reflect the evolving support landscape.</p><h2>4. Human-in-the-Loop and Quality Control</h2><p>High-confidence predictions can be auto-routed, while low-confidence tickets are flagged for manual triage. Feedback from support agents is logged and used to improve future training data. Dashboards track accuracy, coverage, and misclassification patterns.</p><h2>5. Impact and Measurement</h2><p>Success is measured in reduced handling time, better SLA compliance, and improved user satisfaction—metrics that go beyond offline F1-scores. Proper A/B tests help determine the net operational impact of the system.</p><p><strong>Takeaway:</strong> NLP-powered ticket routing is a strong example of how language models can augment human teams when carefully integrated into existing workflows.</p>",
    "category": "Case Studies",
    "image": blog_pic_6,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "How NLP models help support teams scale without burning out"
  },

  // =========================
  // THE STACK (2 POSTS)
  // =========================
  {
    "_id": "675f1a01a3b4c9f0a1b2c307",
    "title": "The Modern Data Science Stack: From Data Lake to Deployed API",
    "description": "<h1>The Modern Data Science Stack: From Data Lake to Deployed API</h1><p>Modern AI applications depend on a robust technical stack that connects raw data to real-time predictions. This stack spans storage, compute, orchestration, modeling frameworks, and serving layers.</p><h2>1. Storage and Ingestion</h2><p>Data typically lands in a data lake (object storage) or data warehouse. Batch and streaming pipelines, often orchestrated with tools like Airflow or Dagster, extract data from operational systems and land it in analytical stores.</p><h2>2. Transformation and Feature Engineering</h2><p>Transformations are built using SQL, Spark, dbt, or similar tools. For ML use cases, a feature store can standardize definitions and enable reuse of vetted, production-ready features across teams and models.</p><h2>3. Modeling Frameworks</h2><p>Python remains the lingua franca of modeling, with libraries such as scikit-learn, XGBoost, PyTorch, and TensorFlow. Notebook environments support exploration, while script- and container-based workflows support reproducible training in CI/CD pipelines.</p><h2>4. Serving and APIs</h2><p>Trained models are packaged as Docker images and deployed behind REST or gRPC APIs using frameworks like FastAPI, Flask, or Node.js services in a MERN stack. Tools like Kubernetes, serverless platforms, or managed endpoints handle scaling and reliability.</p><h2>5. Observability and Governance</h2><p>Monitoring includes input drift, performance degradation, latency, and error rates. Model registries, experiment tracking, and lineage tools ensure that teams can trace which version of a model is in production and how it was trained.</p><p><strong>Takeaway:</strong> A modern data science stack is not just about picking a framework; it is about designing a coherent, observable pipeline that connects data, models, and applications end to end.</p>",
    "category": "The Stack",
    "image": blog_pic_7,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "An end-to-end view of the tooling behind real-world ML systems"
  },
  {
    "_id": "675f1a01a3b4c9f0a1b2c308",
    "title": "MLOps in Practice: CI/CD, Model Registry, and Monitoring",
    "description": "<h1>MLOps in Practice: CI/CD, Model Registry, and Monitoring</h1><p>MLOps extends DevOps principles to machine learning systems. Instead of shipping static applications, teams now ship data-dependent models that change as data and objectives evolve.</p><h2>1. Continuous Integration for ML</h2><p>CI pipelines automatically run unit tests, data validation checks, and training scripts when code changes. They may also run small-scale training runs to ensure that experiments are reproducible before scaling to full training.</p><h2>2. Model Registry and Experiment Tracking</h2><p>A model registry centralizes trained models, their metadata, and their lineage. Tools for experiment tracking record hyperparameters, metrics, and artifacts, making it easier to compare runs and promote the right model to production.</p><h2>3. Continuous Delivery and Deployment</h2><p>CD pipelines package models as containers and deploy them to staging or production environments. Blue–green or canary deployments reduce risk by gradually shifting traffic to new versions while monitoring performance.</p><h2>4. Monitoring and Alerting</h2><p>Monitoring goes beyond API uptime. MLOps teams track input feature drift, prediction distributions, latency, and business KPIs. Alerts are triggered when metrics move outside acceptable bounds, prompting investigation or rollback.</p><h2>5. Closing the Feedback Loop</h2><p>Production data and outcomes feed back into training datasets. This enables periodic retraining or online learning strategies that keep models aligned with evolving reality.</p><p><strong>Takeaway:</strong> MLOps is the backbone that turns experimental notebooks into reliable, observable AI services that integrate cleanly with the rest of your MERN stack.</p>",
    "category": "The Stack",
    "image": blog_pic_8,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "Operationalizing ML so it behaves like real software, not just experiments"
  },

  // =========================
  // INDUSTRY TRENDS (2 POSTS)
  // =========================
  {
    "_id": "675f1a01a3b4c9f0a1b2c309",
    "title": "Industry Trends: The Rise of Generative AI in Production Systems",
    "description": "<h1>Industry Trends: The Rise of Generative AI in Production Systems</h1><p>Generative AI has moved rapidly from research labs into real products: copilots for code, writing assistants, search augmentation, and multimodal tools for images and documents. Underneath the hype, organizations are figuring out how to integrate foundation models safely and reliably.</p><h2>1. From Prototypes to Platform Features</h2><p>Many companies started with chat-style prototypes. The next wave of adoption embeds generative AI into existing products: summarizing documents, drafting emails, assisting with analysis, and supporting customer interactions.</p><h2>2. Retrieval-Augmented Generation (RAG)</h2><p>RAG architectures combine large language models with vector search over internal knowledge bases. This allows organizations to ground model responses in their own data, improving relevance and mitigating hallucinations.</p><h2>3. Cost, Latency, and Model Choice</h2><p>Engineering teams now balance accuracy against latency, cost, and privacy. This leads to hybrid architectures that mix hosted foundation models, distilled smaller models, and occasional fine-tuning or domain adaptation.</p><h2>4. Evaluation and Guardrails</h2><p>Unlike traditional ML tasks with clear labels, generative AI requires new evaluation strategies: human review, rubric-based scoring, and automated checks for safety, bias, and factuality. Guardrails and policy layers are becoming standard parts of the stack.</p><p><strong>Takeaway:</strong> Generative AI is shifting from “try the cool demo” to “how do we make this reliable enough to ship and maintain?”—a transition that strongly shapes modern AI product roadmaps.</p>",
    "category": "Industry Trends",
    "image": blog_pic_9,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "How generative AI is evolving from demos to durable product features"
  },
  {
    "_id": "675f1a01a3b4c9f0a1b2c30a",
    "title": "Industry Trends: Responsible and Regulated AI in 2025",
    "description": "<h1>Industry Trends: Responsible and Regulated AI in 2025</h1><p>As AI systems grow more capable, regulators and organizations are converging on standards for safety, transparency, and accountability. Responsible AI is no longer just a set of principles; it is becoming a concrete set of processes and controls.</p><h2>1. Emerging Regulatory Frameworks</h2><p>Regions around the world are introducing rules that classify AI systems by risk level and mandate documentation, monitoring, and impact assessments for higher-risk use cases. Teams building AI systems must be able to explain data sources, model choices, and potential harms.</p><h2>2. Governance in Practice</h2><p>Effective AI governance includes model inventories, risk registers, review boards, and clear ownership of each system. Policies define where AI can and cannot be used, when human review is required, and how incidents are reported and remediated.</p><h2>3. Fairness, Bias, and Inclusion</h2><p>Fairness audits, bias testing, and diverse evaluation panels help detect disparate impacts across demographic groups. Technical mitigations must be paired with organizational commitments to equity and inclusion.</p><h2>4. Documentation and Model Cards</h2><p>Model cards and system cards summarize intended use, limitations, performance, and known risks. They help downstream users and stakeholders interpret outputs appropriately and highlight scenarios where the model should not be used.</p><p><strong>Takeaway:</strong> In 2025, building AI at scale means building it responsibly. Teams that treat governance, documentation, and fairness as first-class engineering concerns will be better positioned as regulations mature.</p>",
    "category": "Industry Trends",
    "image": blog_pic_10,
    "createdAt": "2025-11-22T00:00:00.000Z",
    "updatedAt": "2025-11-22T00:00:00.000Z",
    "__v": 0,
    "isPublished": true,
    "subTitle": "Where regulation, ethics, and practical AI engineering intersect"
  }
];


export const comments_data = [
        {
            "_id": "6811ed9e7836a82ba747cb25",
            "blog": blog_data[0],
            "name": "Michael Scott",
            "content": "This is my new comment",
            "isApproved": false,
            "createdAt": "2025-04-30T09:30:06.918Z",
            "updatedAt": "2025-04-30T09:30:06.918Z",
            "__v": 0
        },
        {
            "_id": "6810a752fbb942aa7cbf4adb",
            "blog": blog_data[1],
            "name": "John Doe",
            "content": "This is a nice blog",
            "isApproved": false,
            "createdAt": "2025-04-29T10:17:54.832Z",
            "updatedAt": "2025-04-29T10:17:54.832Z",
            "__v": 0
        },
        {
            "_id": "680779aebef75c08f8b4898f",
            "blog": blog_data[2],
            "name": "Jack London",
            "content": "Hi this blog is must to read",
            "isApproved": true,
            "createdAt": "2025-04-22T11:12:46.547Z",
            "updatedAt": "2025-04-22T11:13:10.015Z",
            "__v": 0
        },
        {
            "_id": "680770aeb2897e5c28bf9b26",
            "blog": blog_data[3],
            "name": "Sam Smith",
            "content": "This is the best blog, everybody should read it",
            "isApproved": false,
            "createdAt": "2025-04-22T10:34:22.020Z",
            "updatedAt": "2025-04-22T10:34:22.020Z",
            "__v": 0
        },
        {
            "_id": "68076468e32055c94a696cf5",
            "blog": blog_data[4],
            "name": "Peter Lawrence",
            "content": "Honestly, I did not expect this to work, but it totally did. Saved my project!",
            "isApproved": true,
            "createdAt": "2025-04-22T09:42:00.444Z",
            "updatedAt": "2025-04-22T10:24:55.626Z",
            "__v": 0
        }
    ]

export const dashboard_data = {
    "blogs": 10,
    "comments": 5,
    "drafts": 0,
    "recentBlogs": blog_data.slice(0, 5),
}

export const footer_data = [
      {
          title: "Quick Links",
          links: ["Home", "Best Sellers", "Offers & Deals", "Contact Us", "FAQs"]
      },
      {
          title: "Need Help?",
          links: ["Delivery Information", "Return & Refund Policy", "Payment Methods", "Track your Order", "Contact Us"]
      },
      {
          title: "Follow Us",
          links: ["Instagram", "Twitter", "Facebook", "YouTube"]
      }
  ];
