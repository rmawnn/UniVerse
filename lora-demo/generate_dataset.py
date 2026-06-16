"""
Synthetic dataset generator for UniVerse LoRA fine-tuning.

Produces instruction-following examples across three recommendation tasks:
  1. Community recommendation — given student interests, suggest communities
  2. Job matching — given a student profile and job description, assess fit
  3. Post categorization — given post content, predict category

Output: data/train.jsonl and data/eval.jsonl in chat-template format.
"""

import json
import random
from pathlib import Path

random.seed(42)

# ── Source data ─────────────────────────────────────────────

COMMUNITIES = [
    {"name": "Computer Science Hub", "desc": "Algorithms, data structures, and CS theory discussions"},
    {"name": "AI & Machine Learning", "desc": "Deep learning, NLP, computer vision, and ML research"},
    {"name": "Web Development", "desc": "Frontend, backend, and full-stack web technologies"},
    {"name": "Cybersecurity Club", "desc": "Ethical hacking, CTFs, and information security"},
    {"name": "Data Science Society", "desc": "Statistics, analytics, and data-driven insights"},
    {"name": "Mobile Dev Lab", "desc": "iOS, Android, React Native, and Flutter development"},
    {"name": "GameDev Guild", "desc": "Game design, Unity, Unreal Engine, and game jams"},
    {"name": "Robotics Team", "desc": "Embedded systems, ROS, and autonomous robotics"},
    {"name": "Startup Founders", "desc": "Entrepreneurship, pitch decks, and MVP building"},
    {"name": "Math & Physics", "desc": "Pure math, applied math, and physics problem solving"},
    {"name": "Study Buddies", "desc": "Find study partners, share notes, and organize group sessions"},
    {"name": "Campus Events", "desc": "Hackathons, meetups, talks, and social gatherings on campus"},
    {"name": "Photography Club", "desc": "Digital photography, editing, and creative composition"},
    {"name": "Music Society", "desc": "Musicians, producers, and music theory enthusiasts"},
    {"name": "Fitness & Sports", "desc": "Gym tips, team sports, and campus athletic events"},
    {"name": "Book Club", "desc": "Book reviews, reading lists, and literary discussions"},
    {"name": "Environmental Action", "desc": "Sustainability, climate science, and green campus initiatives"},
    {"name": "Pre-Med Students", "desc": "MCAT prep, med school applications, and clinical experiences"},
    {"name": "Engineering Projects", "desc": "Capstone projects, engineering challenges, and lab work"},
    {"name": "Language Exchange", "desc": "Practice foreign languages with native speakers on campus"},
]

STUDENT_INTERESTS = [
    ["machine learning", "python", "neural networks", "data analysis"],
    ["web development", "react", "javascript", "ui design"],
    ["cybersecurity", "networking", "linux", "penetration testing"],
    ["mobile apps", "flutter", "swift", "kotlin"],
    ["game development", "unity", "3d modeling", "game design"],
    ["robotics", "arduino", "embedded systems", "sensors"],
    ["data science", "statistics", "sql", "visualization"],
    ["entrepreneurship", "business", "marketing", "product management"],
    ["mathematics", "algorithms", "optimization", "calculus"],
    ["photography", "video editing", "content creation", "social media"],
    ["music production", "audio engineering", "piano", "composition"],
    ["fitness", "nutrition", "running", "basketball"],
    ["environmental science", "biology", "sustainability", "climate"],
    ["medicine", "biology", "chemistry", "anatomy"],
    ["cloud computing", "devops", "kubernetes", "aws"],
    ["natural language processing", "transformers", "chatbots", "linguistics"],
    ["blockchain", "smart contracts", "cryptocurrency", "solidity"],
    ["quantum computing", "linear algebra", "physics", "qubits"],
    ["ux research", "user testing", "prototyping", "figma"],
    ["competitive programming", "algorithms", "data structures", "problem solving"],
]

DEPARTMENTS = [
    "Computer Science", "Electrical Engineering", "Data Science",
    "Information Technology", "Software Engineering", "Mechanical Engineering",
    "Biomedical Engineering", "Mathematics", "Physics", "Business Administration",
    "Psychology", "Biology", "Chemistry", "Communications", "Economics",
]

JOB_TITLES = [
    ("Software Engineer Intern", "Python, Django, PostgreSQL, Git. Build REST APIs and microservices."),
    ("Frontend Developer", "React, TypeScript, CSS, responsive design. Build modern web interfaces."),
    ("Data Analyst Intern", "SQL, Python, Tableau, Excel. Analyze business metrics and build dashboards."),
    ("ML Research Assistant", "PyTorch, TensorFlow, NLP, deep learning. Assist with research experiments."),
    ("Mobile Developer", "React Native, Flutter, iOS, Android. Build cross-platform mobile apps."),
    ("DevOps Engineer", "Docker, Kubernetes, AWS, CI/CD. Automate deployment pipelines."),
    ("Cybersecurity Analyst", "Network security, SIEM, penetration testing. Monitor and secure systems."),
    ("UX/UI Designer", "Figma, user research, prototyping, wireframes. Design user experiences."),
    ("Game Developer", "Unity, C#, 3D graphics, game physics. Develop interactive game experiences."),
    ("Backend Developer", "Node.js, Express, MongoDB, REST APIs. Build scalable backend services."),
    ("Product Manager Intern", "Agile, roadmaps, user stories, market research. Drive product strategy."),
    ("Cloud Engineer", "AWS, GCP, Terraform, serverless. Design cloud infrastructure solutions."),
    ("Embedded Systems Engineer", "C, C++, RTOS, microcontrollers. Develop firmware for IoT devices."),
    ("Technical Writer", "Documentation, API docs, tutorials. Create clear technical content."),
    ("QA Engineer", "Selenium, Jest, test automation, CI. Ensure software quality through testing."),
]

POST_TEMPLATES = {
    "academic": [
        "Can anyone share notes from {course}? I missed the lecture on {topic}.",
        "Study group for {course} finals — meet at the library {day} at {time}.",
        "Professor just uploaded the {course} midterm grades. How did everyone do?",
        "Need help understanding {topic} in {course}. Any tutors available?",
        "The {course} homework deadline got extended to {day}. Just FYI!",
        "Anyone else struggling with the {course} problem set? Question 3 is impossible.",
        "Great lecture today on {topic}. The professor really explained it well.",
        "Looking for study partners for the {course} final exam next week.",
    ],
    "research": [
        "Our lab just published a paper on {topic} in {venue}. Check it out!",
        "Looking for undergrads to join our {topic} research project this semester.",
        "Has anyone used {tool} for {topic} research? Need advice on setup.",
        "PhD applications are due soon. Any tips for writing research statements?",
        "Presenting our {topic} findings at {venue} next month. Excited!",
        "Need participants for a study on {topic}. Takes 30 min, $15 compensation.",
        "Literature review help: looking for recent papers on {topic}.",
    ],
    "internship": [
        "{company} is hiring summer interns for {role}! Apply before {deadline}.",
        "Just got an internship at {company} as a {role}. Happy to share my experience!",
        "Internship fair this {day} in the student center. {company} will be there.",
        "Any tips for the {company} internship interview? What should I prepare?",
        "Summer internship applications are opening. Here are the top opportunities for {field}.",
        "Completed my internship at {company}. AMA about the {role} experience.",
    ],
    "job": [
        "We're hiring a {role} at {company}. Full-time, {location}. DM for details.",
        "Just accepted a full-time {role} offer at {company}! So grateful.",
        "{company} is looking for a {role}. Remote-friendly, competitive salary.",
        "Career fair next {day}. {company} has openings for {role} positions.",
        "Graduated and looking for {role} positions. Any leads in {location}?",
        "Freelance {role} opportunity — {company} needs help with a 3-month project.",
    ],
    "housing": [
        "Room available in a 3BR apartment near campus. ${price}/month, utilities included.",
        "Looking for a roommate for next semester. Quiet, non-smoking. {location}.",
        "Subletting my studio for the summer. {location}, ${price}/month.",
        "Anyone know good apartments near {location}? Budget around ${price}.",
        "Moving out — furniture for sale! Desk, chair, bookshelf. DM for photos.",
        "Warning: avoid {location} apartments. Terrible landlord and maintenance.",
    ],
    "event": [
        "Hackathon this weekend at {location}! Free food, prizes, and swag.",
        "Guest speaker from {company} talking about {topic} this {day} at {time}.",
        "Club meeting tonight at {time} in {location}. All welcome!",
        "Annual campus festival is {day}! Live music, food trucks, and games.",
        "Workshop: Introduction to {topic}. {day} at {time}, {location}.",
        "Networking mixer with {company} alumni this {day}. Free pizza!",
    ],
    "marketplace": [
        "Selling {item} — barely used, ${price}. Pick up on campus.",
        "Free {item} to whoever picks it up first. DM me your number.",
        "Looking to buy a used {item}. Budget: ${price}. Anyone selling?",
        "Textbooks for sale: {course} edition, ${price} each. Great condition.",
        "Trading my {item} for a {item2}. Anyone interested?",
        "Garage sale this {day}! Everything must go. {location}.",
    ],
    "general": [
        "Beautiful sunset from the library rooftop today. Love this campus!",
        "Anyone else think the dining hall food has gotten worse this semester?",
        "Lost my {item} somewhere near {location}. Please DM if found!",
        "Happy {holiday}! Hope everyone has a great break.",
        "The campus WiFi is down again. Is it just me or everyone?",
        "Shoutout to {person} for being an amazing TA this semester!",
        "Just finished my first year. Any advice for incoming sophomores?",
    ],
}

FILL_DATA = {
    "course": ["CS 301", "MATH 201", "PHYS 101", "BIO 220", "ECON 101", "ENG 102", "STAT 200", "CHEM 150"],
    "topic": ["neural networks", "graph algorithms", "quantum mechanics", "organic chemistry",
              "market dynamics", "transformer models", "embedded systems", "data visualization"],
    "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "time": ["2pm", "3pm", "4pm", "5pm", "6pm", "7pm"],
    "venue": ["NeurIPS", "AAAI", "ICML", "CHI", "IEEE", "ACM SIGMOD"],
    "tool": ["PyTorch", "TensorFlow", "MATLAB", "R Studio", "SPSS", "Jupyter"],
    "company": ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Spotify", "Netflix", "Stripe"],
    "role": ["software engineer", "data analyst", "product designer", "research assistant", "DevOps engineer"],
    "deadline": ["March 15", "April 1", "May 30", "January 20", "February 28"],
    "field": ["CS students", "engineering majors", "data science", "design"],
    "location": ["downtown", "campus area", "north side", "student village", "engineering building"],
    "price": ["450", "500", "600", "750", "800", "25", "50", "100", "150"],
    "item": ["laptop", "textbook", "bicycle", "monitor", "headphones", "calculator", "backpack"],
    "item2": ["tablet", "keyboard", "desk lamp", "camera", "speaker"],
    "person": ["Professor Kim", "the library staff", "the CS department", "Student Council"],
    "holiday": ["Thanksgiving", "Spring Break", "Winter Break", "New Year"],
}


def fill_template(template: str) -> str:
    """Replace {placeholders} with random values."""
    result = template
    for key, values in FILL_DATA.items():
        placeholder = "{" + key + "}"
        while placeholder in result:
            result = result.replace(placeholder, random.choice(values), 1)
    return result


def generate_community_recommendation_examples(n: int) -> list[dict]:
    examples = []
    for _ in range(n):
        interests = random.choice(STUDENT_INTERESTS)
        dept = random.choice(DEPARTMENTS)
        num_recs = random.randint(2, 4)
        recommended = random.sample(COMMUNITIES, num_recs)

        instruction = (
            f"A student in {dept} is interested in: {', '.join(interests)}. "
            f"Recommend {num_recs} communities they should join and explain why."
        )

        lines = []
        for c in recommended:
            reason = _generate_reason(c, interests)
            lines.append(f"- **{c['name']}**: {reason}")
        response = "\n".join(lines)

        examples.append({
            "messages": [
                {"role": "system", "content": "You are UniVerse, a university social network assistant. Recommend communities based on student interests and department."},
                {"role": "user", "content": instruction},
                {"role": "assistant", "content": response},
            ]
        })
    return examples


def _generate_reason(community: dict, interests: list[str]) -> str:
    templates = [
        f"{community['desc']}. This aligns with your interest in {random.choice(interests)}.",
        f"Given your background in {random.choice(interests)}, {community['desc'].lower()} would be a great fit.",
        f"This community focuses on {community['desc'].lower()}. You'll find others who share your passion for {random.choice(interests)}.",
        f"Your interest in {random.choice(interests)} makes this a strong match. {community['desc']}.",
    ]
    return random.choice(templates)


def generate_job_matching_examples(n: int) -> list[dict]:
    examples = []
    for _ in range(n):
        interests = random.choice(STUDENT_INTERESTS)
        dept = random.choice(DEPARTMENTS)
        job_title, job_desc = random.choice(JOB_TITLES)
        bio = f"{dept} student interested in {', '.join(interests[:2])}"

        overlap = set(interests) & set(job_desc.lower().split())
        score = random.randint(30, 95)
        match_level = "strong" if score >= 70 else "moderate" if score >= 45 else "weak"

        instruction = (
            f"Student profile: {bio}. Skills: {', '.join(interests)}.\n"
            f"Job: {job_title}. Requirements: {job_desc}\n"
            f"Assess how well this student matches this job."
        )

        response = (
            f"Match score: {score}/100 ({match_level} match).\n"
            f"Strengths: The student's background in {', '.join(interests[:2])} "
            f"is relevant to this {job_title} role.\n"
        )
        if score < 70:
            missing = random.sample(["system design", "teamwork", "cloud experience",
                                     "leadership", "communication"], 2)
            response += f"Areas to develop: {', '.join(missing)}.\n"
        response += f"Recommendation: {'Apply' if score >= 50 else 'Consider upskilling first'}."

        examples.append({
            "messages": [
                {"role": "system", "content": "You are UniVerse, a university career advisor. Assess job-student fit based on skills, interests, and requirements."},
                {"role": "user", "content": instruction},
                {"role": "assistant", "content": response},
            ]
        })
    return examples


def generate_categorization_examples(n: int) -> list[dict]:
    examples = []
    categories = list(POST_TEMPLATES.keys())
    per_category = max(1, n // len(categories))

    for category in categories:
        templates = POST_TEMPLATES[category]
        for _ in range(per_category):
            template = random.choice(templates)
            content = fill_template(template)

            examples.append({
                "messages": [
                    {"role": "system", "content": "You are UniVerse, a university social network assistant. Categorize posts into: academic, research, internship, job, housing, event, marketplace, or general."},
                    {"role": "user", "content": f"Categorize this post: \"{content}\""},
                    {"role": "assistant", "content": category},
                ]
            })
    return examples


def main():
    out_dir = Path(__file__).parent / "data"
    out_dir.mkdir(exist_ok=True)

    all_examples = []
    all_examples.extend(generate_community_recommendation_examples(200))
    all_examples.extend(generate_job_matching_examples(200))
    all_examples.extend(generate_categorization_examples(200))

    random.shuffle(all_examples)

    split = int(len(all_examples) * 0.85)
    train = all_examples[:split]
    eval_ = all_examples[split:]

    train_path = out_dir / "train.jsonl"
    eval_path = out_dir / "eval.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        for ex in train:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    with open(eval_path, "w", encoding="utf-8") as f:
        for ex in eval_:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"Generated {len(train)} training examples -> {train_path}")
    print(f"Generated {len(eval_)} evaluation examples -> {eval_path}")

    # Print distribution
    for split_name, data in [("Train", train), ("Eval", eval_)]:
        counts = {}
        for ex in data:
            sys_msg = ex["messages"][0]["content"]
            if "Recommend communities" in sys_msg:
                task = "community_rec"
            elif "career advisor" in sys_msg:
                task = "job_match"
            else:
                task = "categorization"
            counts[task] = counts.get(task, 0) + 1
        print(f"  {split_name}: {counts}")


if __name__ == "__main__":
    main()
