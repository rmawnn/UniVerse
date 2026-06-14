"""
AI Demo Seed Script for UniVerse.

Generates realistic demo data to showcase AI features:
- 20 students across 6 departments
- 6 communities matching AI recommendation categories
- 80 posts distributed across 8 categories
- 20 job/internship postings with required skills
- Rich interactions: follows, likes, comments, saves, memberships

Idempotent: checks for existing seed data before inserting.
Does NOT delete existing data.

Usage:
    cd backend
    python -m scripts.seed_ai_demo
"""

import asyncio
import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from uuid import uuid4
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from app.core.database import engine as async_engine, async_session_factory as async_session
from app.core.security import hash_password
from app.models.user import User
from app.models.university import University
from app.models.community import Community, CommunityMember
from app.models.post import Post
from app.models.comment import Comment
from app.models.post_like import PostLike
from app.models.saved_post import SavedPost
from app.models.job_post import JobPost
from app.models.job_application import JobApplication
from app.models.user_follow import UserFollow

SEED_TAG = "aidemo"
PASSWORD_HASH = hash_password("AiDemo2025!")

# ── User definitions ──────────────────────────────────────────────

USER_DEFS = [
    ("ai_elif", "Elif Yilmaz", "elif.yilmaz@iru.edu.tr", "Computer Engineering", 3,
     "Deep learning researcher, PyTorch enthusiast. Working on NLP for Turkish."),
    ("ai_mert", "Mert Ozkan", "mert.ozkan@iru.edu.tr", "Software Engineering", 4,
     "Full-stack developer, open-source contributor. React + FastAPI."),
    ("ai_zeynep", "Zeynep Demir", "zeynep.demir@iru.edu.tr", "AI Engineering", 2,
     "Computer vision and robotics. Building autonomous systems."),
    ("ai_baris", "Baris Kaya", "baris.kaya@iru.edu.tr", "Cyber Security", 3,
     "Penetration tester, CTF player. Security researcher."),
    ("ai_selin", "Selin Arslan", "selin.arslan@iru.edu.tr", "Business", 4,
     "Data-driven marketing, startup founder. Bridging tech and business."),
    ("ai_can", "Can Polat", "can.polat@iru.edu.tr", "Architecture", 2,
     "Computational design, parametric modeling. Grasshopper + Python."),
    ("ai_ayse", "Ayse Celik", "ayse.celik@iru.edu.tr", "Computer Engineering", 4,
     "Backend developer, distributed systems. Kubernetes and Go."),
    ("ai_emre", "Emre Sahin", "emre.sahin@iru.edu.tr", "Software Engineering", 3,
     "Mobile developer, Flutter and SwiftUI. UI/UX enthusiast."),
    ("ai_deniz", "Deniz Yildiz", "deniz.yildiz@iru.edu.tr", "AI Engineering", 4,
     "Reinforcement learning, game AI. Published at AAAI."),
    ("ai_hakan", "Hakan Erdogan", "hakan.erdogan@iru.edu.tr", "Cyber Security", 2,
     "Network security, malware analysis. Blue team defender."),
    ("ai_melis", "Melis Korkmaz", "melis.korkmaz@iru.edu.tr", "Business", 3,
     "Product management, agile methodologies. Certified Scrum Master."),
    ("ai_omer", "Omer Aksoy", "omer.aksoy@iru.edu.tr", "Architecture", 3,
     "Sustainable design, BIM specialist. LEED certified."),
    ("ai_ipek", "Ipek Turan", "ipek.turan@iru.edu.tr", "Computer Engineering", 2,
     "Database systems, data engineering. Apache Spark enthusiast."),
    ("ai_burak", "Burak Guler", "burak.guler@iru.edu.tr", "Software Engineering", 4,
     "DevOps engineer, CI/CD pipelines. Terraform and AWS."),
    ("ai_naz", "Naz Ozturk", "naz.ozturk@iru.edu.tr", "AI Engineering", 3,
     "NLP researcher, transformer models. Working on multilingual BERT."),
    ("ai_kerem", "Kerem Acar", "kerem.acar@iru.edu.tr", "Cyber Security", 4,
     "Application security, SAST/DAST tools. Bug bounty hunter."),
    ("ai_yagmur", "Yagmur Sen", "yagmur.sen@iru.edu.tr", "Business", 2,
     "Finance and fintech. Interested in blockchain applications."),
    ("ai_arda", "Arda Cetin", "arda.cetin@iru.edu.tr", "Architecture", 4,
     "Urban planning, GIS analysis. Smart city advocate."),
    ("ai_derya", "Derya Bozkurt", "derya.bozkurt@iru.edu.tr", "Computer Engineering", 3,
     "Compiler design, programming languages. Rust contributor."),
    ("ai_tolga", "Tolga Bulut", "tolga.bulut@iru.edu.tr", "Software Engineering", 2,
     "Game developer, Unity and Unreal. XR experiences."),
]

# ── Community definitions ─────────────────────────────────────────

COMMUNITY_DEFS = [
    ("AI & Machine Learning",
     "Discuss AI research, share ML projects, paper readings, and career advice in artificial intelligence.",
     0),  # creator index
    ("Cyber Security Club",
     "CTF challenges, security news, vulnerability research, and career paths in cybersecurity.",
     3),
    ("Software Projects",
     "Showcase your projects, find collaborators, code reviews, and open-source contributions.",
     1),
    ("Internship Network",
     "Share internship opportunities, interview tips, resume reviews, and career guidance.",
     4),
    ("Campus Events",
     "Hackathons, workshops, seminars, guest lectures, and social events on campus.",
     7),
    ("Housing & Roommates",
     "Find housing near campus, roommate matching, moving tips, and neighborhood reviews.",
     5),
]

# ── Post content (80 posts across 8 categories) ──────────────────

POST_CONTENT = {
    "academic": [
        "Just finished my thesis proposal on distributed consensus algorithms. My advisor suggested focusing on Byzantine fault tolerance in heterogeneous networks. Any recommendations for recent papers?",
        "Study group for BLG312 Computer Architecture final exam this Thursday at the library, 3rd floor. Bringing past exam solutions and summary notes. Everyone welcome!",
        "Professor Yilmaz posted the midterm grades for Data Structures. The class average was 62 — anyone else think the grading curve should be adjusted?",
        "Looking for someone to explain the difference between LL(1) and LR(1) parsers. The textbook explanation is confusing and I have the compiler design exam next week.",
        "Completed the Stanford CS229 machine learning course on Coursera. Highly recommend it if you want a solid foundation before taking our university's ML class.",
        "Does anyone have the lab manual for Digital Logic Design? I missed the first lab session and need to catch up before the next one.",
        "Writing a literature review on federated learning. Found 40+ papers but need help narrowing down to the most impactful ones. Suggestions?",
        "The math department is offering a new elective on Graph Theory next semester. Prerequisites are Discrete Math and Linear Algebra. Planning to take it.",
        "Can someone recommend a good textbook for Operating Systems? I've heard Tanenbaum is the standard but Silberschatz seems more practical.",
        "Our capstone project team needs a 4th member with database experience. We're building a real-time analytics dashboard using PostgreSQL and TimescaleDB.",
    ],
    "research": [
        "Our lab just got accepted to CVPR 2025! Paper on self-supervised learning for medical image segmentation. Happy to share a preprint with anyone interested.",
        "Interesting finding: fine-tuning a 1.5B parameter model with LoRA achieves 94% of full fine-tuning performance at 1/10th the compute cost. Running more ablations this week.",
        "Looking for collaborators on a research project: using graph neural networks for drug discovery. We have access to the ChEMBL dataset and a small GPU cluster.",
        "Just read the Mamba paper on selective state spaces. This could be a real alternative to transformers for long-sequence modeling. Anyone want to discuss?",
        "Our professor is hiring 2 undergraduate research assistants for a project on adversarial robustness in LLMs. Stipend included. DM me for details.",
        "Published my first paper! It's on zero-shot cross-lingual transfer for low-resource languages. Took 8 months from idea to acceptance. AMA about the process.",
        "Running experiments on contrastive learning for recommendation systems. Current results show 15% improvement over collaborative filtering baselines.",
        "The NeurIPS 2025 submission deadline is in 6 weeks. Looking for feedback on my draft about efficient attention mechanisms. Will reciprocate reviews.",
        "Interesting seminar today on quantum computing applications in optimization. Professor showed how QAOA outperforms classical solvers on specific graph problems.",
        "Created a benchmark dataset for Turkish NLP tasks. 50K annotated sentences across sentiment, NER, and POS tagging. Will release on HuggingFace next month.",
    ],
    "internship": [
        "Just got my summer internship offer from Google! Applied to the SWE intern position in Zurich. Happy to share my interview experience and preparation strategy.",
        "Amazon Web Services is hiring intern cloud architects for Summer 2025. The application deadline is March 15. They specifically mentioned wanting students with Kubernetes experience.",
        "Completed my internship at a cybersecurity startup. Learned more in 3 months than in a full semester. If you get a chance to work at a startup, take it!",
        "Microsoft Explore internship applications are open. It's perfect for freshmen and sophomores who aren't sure which area of CS they want to focus on.",
        "Tips from my Meta internship: 1) Ask questions early 2) Ship something in the first 2 weeks 3) Build relationships with your team 4) Document everything.",
        "Looking for a summer research internship in NLP or computational linguistics. Have experience with HuggingFace Transformers and published one workshop paper.",
        "SAP Turkey is hiring 10 interns for their Istanbul office. Positions in ABAP development, UX design, and data analytics. Deadline is next Friday.",
        "My internship at a fintech company starts next month. Any advice on what to expect? I'll be working on their payment processing backend (Java + Spring Boot).",
        "University career center is organizing an internship fair next Wednesday. Over 30 companies confirmed including Siemens, Bosch, and several local tech startups.",
        "Remote internship opportunity at a Silicon Valley AI startup. They're building a code review tool using LLMs. Looking for students with Python and ML experience.",
    ],
    "job": [
        "Hiring a junior backend developer at our startup. Stack: Python, FastAPI, PostgreSQL, Docker. Remote-friendly, competitive salary. DM for the job description.",
        "TechCorp Istanbul is looking for a DevOps engineer. Requirements: 2+ years with AWS/GCP, Terraform, CI/CD pipelines. Great benefits and a modern office in Maslak.",
        "Freelance opportunity: need someone to build a React Native mobile app for a local restaurant chain. Budget: 15K TL. Timeline: 6 weeks. Portfolio required.",
        "Our AI startup just raised Series A funding and we're expanding the team. Looking for ML engineers with experience in production ML systems. Visa sponsorship available.",
        "Part-time tutoring job: teaching Python programming to high school students at a local coding bootcamp. 3 evenings per week, 150 TL/hour. Perfect for students.",
        "Graduation is 2 months away and I just accepted a full-time offer at Trendyol as a data engineer! The interview process had 4 rounds over 3 weeks.",
        "ASELSAN is recruiting new graduates for their radar systems division. They want EE or CE graduates with signal processing knowledge. Apply on their careers page.",
        "Anyone know companies hiring UX researchers? I have a portfolio of 5 user research projects and an HCI specialization. Open to both Istanbul and Ankara.",
        "Contract position: 3-month project building an ETL pipeline for a healthcare company. They need someone with Apache Airflow and dbt experience. Fully remote.",
        "Our professor's spin-off company needs a part-time frontend developer. Next.js + TypeScript. 20 hours/week, flexible schedule. Good for students wanting real experience.",
    ],
    "housing": [
        "Looking for a roommate near campus. 2-bedroom apartment on Bagdat Caddesi, 5 min walk to the university. Rent is 8500 TL split two ways. Available from February.",
        "Moving out of my studio apartment near the metro station. Lease ends March 31. Landlord is flexible with new tenants. Rent is 7000 TL including utilities.",
        "Anyone know a good moving company? I need to move from the dorms to an off-campus apartment next weekend. Have a bed, desk, and about 10 boxes.",
        "PSA: The new student housing complex near the north gate is now accepting applications. Priority given to verified students. Monthly rent starts at 5500 TL.",
        "Subletting my room for the summer (June-August). Furnished, AC, fast internet, shared kitchen. 6000 TL/month near the engineering building. DM for photos.",
        "Roommate wanted! We're 3 CE students in a 4-bedroom apartment. Looking for someone quiet and clean. No smoking. 4000 TL/month + utilities. 10 min by bus to campus.",
        "Warning: avoid the apartments on Yesil Sokak. The landlord doesn't maintain the building and there have been water leakage issues all winter.",
        "Does anyone know if the university offers short-term housing for exchange students? My friend from Germany is visiting for 3 months and needs a place.",
        "Furnished single room available in a shared flat. 2 bathrooms, washing machine, balcony. 5500 TL/month. Available immediately. Close to the main library.",
        "Tips for first-time renters: always get the lease in writing, take photos before moving in, check water pressure, and verify the internet speed before signing.",
    ],
    "event": [
        "HackIRU 2025 — 48-hour hackathon on campus! Theme: sustainable tech solutions. Prizes worth 50K TL. Teams of 3-5 people. Registration opens next Monday.",
        "Guest lecture: Dr. Sarah Chen from DeepMind will talk about 'Scaling Laws in Large Language Models' this Friday at 2 PM in the main auditorium. Don't miss it!",
        "Photography exhibition by Architecture students in the campus gallery. Opening reception Thursday evening with free food and drinks. Showcasing 30+ works.",
        "The Computer Science department is hosting a career panel with alumni working at Google, Amazon, and Microsoft. Next Tuesday at 4 PM in Room 301.",
        "Free workshop: Introduction to Docker and Container Orchestration. Saturday 10 AM - 4 PM at the tech lab. Bring your laptop. Lunch provided.",
        "Annual sports tournament starts next week. Sign up for basketball, volleyball, or table tennis. Register at the student affairs office by Wednesday.",
        "AI Ethics debate night: 'Should autonomous weapons be banned?' Featuring professors from CS, Philosophy, and Political Science departments. Thursday 7 PM.",
        "Student startup demo day! 8 teams will pitch their projects to a panel of investors and industry experts. Come support your classmates. Friday at 6 PM.",
        "Cybersecurity workshop: hands-on CTF challenge for beginners. Learn web exploitation, reverse engineering, and cryptography basics. No experience required.",
        "End-of-semester concert at the campus amphitheater! Student bands performing, food trucks, and a DJ. Free entry with student ID. Saturday evening.",
    ],
    "marketplace": [
        "Selling my 2023 MacBook Pro M2, 16GB RAM, 512GB SSD. Used for 1 year, excellent condition. Original box and charger included. Asking 45K TL.",
        "Free textbooks: I'm graduating and giving away my CS textbooks. Available: CLRS Algorithms, Tanenbaum OS, and Kurose Networking. First come first served at the library.",
        "Looking to buy a used mechanical keyboard. Cherry MX Blue or Brown switches preferred. Budget: up to 2000 TL. Let me know what you have!",
        "Selling my IKEA desk and office chair. Bought 6 months ago, moving and can't take them. Desk: 1500 TL, Chair: 2000 TL, or both for 3000 TL.",
        "Anyone selling a used iPad for note-taking? iPad Air or Pro with Apple Pencil preferred. Budget around 15K TL. Need it for the new semester.",
        "Trading my Nintendo Switch (with 4 games) for a drawing tablet. Wacom or similar brand. Switch is in perfect condition with original packaging.",
        "Selling my mountain bike. Kron brand, 21 speeds, front suspension. Great for campus commuting. Used for 2 semesters. 5000 TL or best offer.",
        "Lab coat and safety goggles for Chemistry lab — barely used, selling for 200 TL (new price was 500 TL). Size M lab coat.",
        "Moving sale: mini fridge (1200 TL), microwave (800 TL), electric kettle (300 TL), desk lamp (200 TL). All in working condition. Can deliver on campus.",
        "Looking for someone to share a Spotify Family plan. Currently 3/6 slots filled. Your share would be 20 TL/month. DM me your email.",
    ],
    "general": [
        "Anyone else noticed the new coffee shop that opened near Gate 2? Their flat white is amazing and they have student discounts until the end of the month.",
        "Lost my student ID card somewhere between the library and the engineering building yesterday. If found, please drop it at the student affairs office. Name: Elif Yilmaz.",
        "The campus Wi-Fi has been terrible this week. Is it just me or is everyone experiencing slow connections? Especially in the science building.",
        "Shout-out to the cafeteria staff for adding vegan options to the lunch menu! The falafel wrap is actually really good.",
        "Does anyone know the process for getting a parking permit for next semester? The website just redirects to a broken link.",
        "Looking for recommendations: best study spots near campus that are open late? The library closes at 10 PM which isn't late enough during exam season.",
        "The campus shuttle schedule changed again. New timetable is posted at each stop. The evening shuttle now runs every 30 minutes instead of 20.",
        "Has anyone tried the new 3D printing service at the maker space? How much does it cost per hour and what materials do they support?",
        "Friendly reminder: the deadline to register for next semester's courses is January 15. Don't forget to check your advisor hold before registering.",
        "Who's going to the football game this Saturday? We're playing against Marmara University. Would be great to have a big student section!",
    ],
}

# ── Job definitions ───────────────────────────────────────────────

JOB_DEFS = [
    ("Junior Python Developer", "Backend development with Python, FastAPI, and PostgreSQL. Build REST APIs and microservices for our e-commerce platform.", "TechStart Istanbul", "Istanbul", "full-time",
     "Python, FastAPI, PostgreSQL, Docker, REST APIs"),
    ("Machine Learning Intern", "Join our ML team to work on recommendation systems. You'll train models, run experiments, and help deploy to production.", "DataMinds AI", "Istanbul", "internship",
     "Python, PyTorch, scikit-learn, pandas, SQL"),
    ("Frontend Developer", "Build responsive web applications using React and TypeScript. Work closely with UX designers to implement pixel-perfect interfaces.", "WebCraft Studio", "Remote", "full-time",
     "React, TypeScript, Next.js, Tailwind CSS, Git"),
    ("Cybersecurity Analyst Intern", "Monitor security events, perform vulnerability assessments, and assist with incident response in our SOC team.", "SecureNet Turkey", "Ankara", "internship",
     "Network security, SIEM tools, Linux, Python, Wireshark"),
    ("Mobile Developer (Flutter)", "Develop cross-platform mobile applications for our fintech products. Experience with state management and API integration required.", "PayTech Solutions", "Istanbul", "full-time",
     "Flutter, Dart, Firebase, REST APIs, Git"),
    ("Data Engineering Intern", "Build and maintain ETL pipelines using Apache Airflow and dbt. Work with large datasets in our cloud data warehouse.", "AnalyticsCo", "Istanbul", "internship",
     "Python, SQL, Apache Airflow, dbt, AWS/GCP"),
    ("DevOps Engineer", "Manage CI/CD pipelines, Kubernetes clusters, and cloud infrastructure. Automate everything from testing to deployment.", "CloudFirst", "Istanbul", "full-time",
     "Kubernetes, Docker, Terraform, AWS, CI/CD, Linux"),
    ("NLP Research Assistant", "Work on Turkish language processing tasks including text classification, NER, and machine translation. Part-time position.", "University AI Lab", "Istanbul", "part-time",
     "Python, HuggingFace Transformers, NLP, PyTorch"),
    ("UI/UX Design Intern", "Design user interfaces for web and mobile applications. Conduct user research and create interactive prototypes.", "DesignHub Agency", "Istanbul", "internship",
     "Figma, user research, prototyping, wireframing"),
    ("Full-Stack Developer", "Work on both frontend (React) and backend (Node.js) of our SaaS platform. Startup environment with rapid iteration.", "SaaSify", "Remote", "full-time",
     "React, Node.js, TypeScript, MongoDB, AWS"),
    ("Blockchain Developer Intern", "Smart contract development on Ethereum and Solana. Build DeFi protocols and contribute to open-source Web3 tools.", "CryptoLab Turkey", "Istanbul", "internship",
     "Solidity, Rust, Web3.js, blockchain, smart contracts"),
    ("Game Developer", "Unity development for mobile games. Work on gameplay systems, UI, and performance optimization for our puzzle game.", "PlayMakers Studio", "Istanbul", "full-time",
     "Unity, C#, game design, mobile development, Git"),
    ("Cloud Solutions Intern", "Help customers migrate to cloud infrastructure. Learn AWS services hands-on and get certified during the internship.", "AWS Partner Co", "Ankara", "internship",
     "AWS, Linux, networking, Python, cloud architecture"),
    ("Technical Writer", "Create documentation for our API and developer tools. Must be able to understand and explain complex technical concepts clearly.", "DevToolsCo", "Remote", "part-time",
     "Technical writing, API documentation, Markdown, Git"),
    ("Computer Vision Engineer", "Develop image processing pipelines for our autonomous drone navigation system. Work with real-time object detection models.", "DroneVision", "Istanbul", "full-time",
     "Python, OpenCV, PyTorch, YOLO, embedded systems"),
    ("QA Engineering Intern", "Write automated tests, perform manual testing, and help improve our CI test pipeline. Great entry point into software engineering.", "TestPro Software", "Istanbul", "internship",
     "Python, Selenium, API testing, CI/CD, SQL"),
    ("Embedded Systems Developer", "Firmware development for IoT devices using C/C++ and RTOS. Interface with sensors, BLE modules, and cloud backends.", "IoTech Solutions", "Ankara", "full-time",
     "C, C++, RTOS, embedded systems, IoT protocols"),
    ("Product Management Intern", "Help define product roadmaps, analyze user metrics, and coordinate between engineering and design teams.", "StartupXYZ", "Istanbul", "internship",
     "Product management, analytics, Jira, user research, SQL"),
    ("Backend Developer (Go)", "Build high-performance microservices in Go. Focus on payment processing and real-time event systems.", "FinFlow", "Istanbul", "full-time",
     "Go, gRPC, PostgreSQL, Redis, Docker, Kafka"),
    ("AI/ML Intern — Computer Vision", "Work on medical image analysis using deep learning. Segment and classify pathology slides using state-of-the-art models.", "HealthAI", "Istanbul", "internship",
     "Python, PyTorch, computer vision, deep learning, medical imaging"),
]

# ── Comment templates ─────────────────────────────────────────────

COMMENT_TEMPLATES = [
    "Great post! Thanks for sharing this.",
    "This is really helpful, I was looking for exactly this information.",
    "Interesting perspective. Have you considered {topic}?",
    "I had a similar experience. Happy to share notes if you want.",
    "Can you share more details about this?",
    "Thanks for the heads up! I'll definitely check this out.",
    "This is exactly what our department needs.",
    "Does anyone else have experience with this?",
    "Bookmarked for later. Really useful resource.",
    "I disagree with some points but overall a good discussion.",
    "When is the deadline for this?",
    "Count me in! How do I sign up?",
    "Really well explained. Wish my professors were this clear.",
    "This helped me a lot, thank you!",
    "Would love to connect and discuss further.",
    "Any update on this? Still relevant?",
    "Sharing with my study group. They'll find this useful.",
    "Just what I needed before the exam. Thanks!",
    "This deserves more visibility. Upvoted!",
    "Following this thread for updates.",
]

COMMENT_TOPICS = [
    "the scalability aspects", "using a different framework",
    "the long-term maintenance", "cost optimization",
    "the security implications", "alternative approaches",
    "the learning curve", "open-source alternatives",
]


async def seed():
    async with async_session() as session:
        # ── Idempotency check ─────────────────────────────────
        result = await session.execute(
            text("SELECT COUNT(*) FROM users WHERE username LIKE 'ai_%'")
        )
        existing = result.scalar()
        if existing >= 20:
            print(f"AI demo data already exists ({existing} ai_* users). Skipping.")
            print("To re-seed, delete users with username LIKE 'ai_%' first.")
            return

        now = datetime.now(timezone.utc)
        random.seed(42)

        # ── University ────────────────────────────────────────
        uni_result = await session.execute(
            text("SELECT id FROM universities WHERE domain='iru.edu.tr'")
        )
        uni_row = uni_result.first()
        if uni_row:
            uni_id = uni_row[0]
            print("Found existing IRU university.")
        else:
            uni_id = uuid4()
            uni = University(
                id=uni_id,
                name="Istanbul Rumeli University",
                domain="iru.edu.tr",
                country="Turkey",
            )
            session.add(uni)
            await session.flush()
            print("Created university: Istanbul Rumeli University")

        # ── Users ─────────────────────────────────────────────
        users = []
        for username, full_name, email, dept, year, bio in USER_DEFS:
            # Skip if already exists
            check = await session.execute(
                text("SELECT id FROM users WHERE username=:u"),
                {"u": username},
            )
            if check.first():
                # Fetch existing
                row = await session.execute(
                    text("SELECT id FROM users WHERE username=:u"),
                    {"u": username},
                )
                uid = row.scalar()
                users.append(uid)
                continue

            uid = uuid4()
            u = User(
                id=uid,
                username=username,
                full_name=full_name,
                email=email,
                password_hash=PASSWORD_HASH,
                university_id=uni_id,
                department=dept,
                academic_year=year,
                bio=bio,
                is_active=True,
                email_verified=True,
                is_verified_student=True,
                role="student",
            )
            session.add(u)
            users.append(uid)

        await session.flush()
        print(f"Created {len(users)} users.")

        # ── Communities ───────────────────────────────────────
        communities = []
        for name, desc, creator_idx in COMMUNITY_DEFS:
            check = await session.execute(
                text("SELECT id FROM communities WHERE name=:n AND university_id=:u"),
                {"n": name, "u": str(uni_id)},
            )
            if check.first():
                row = await session.execute(
                    text("SELECT id FROM communities WHERE name=:n AND university_id=:u"),
                    {"n": name, "u": str(uni_id)},
                )
                cid = row.scalar()
                communities.append(cid)
                continue

            cid = uuid4()
            c = Community(
                id=cid,
                name=name,
                description=desc,
                university_id=uni_id,
                created_by=users[creator_idx],
                is_public=True,
            )
            session.add(c)
            communities.append(cid)

        await session.flush()
        print(f"Created {len(communities)} communities.")

        # ── Community memberships ─────────────────────────────
        # Map communities to departments with affinity
        # 0=AI&ML, 1=CyberSec, 2=SoftProj, 3=Internship, 4=Events, 5=Housing
        dept_affinity = {
            "Computer Engineering": [0, 2, 3, 4],
            "Software Engineering": [2, 0, 3, 4],
            "AI Engineering": [0, 2, 3, 4],
            "Cyber Security": [1, 2, 3, 4],
            "Business": [3, 4, 5],
            "Architecture": [4, 5, 3],
        }

        membership_count = 0
        for i, (username, _, _, dept, _, _) in enumerate(USER_DEFS):
            affinities = dept_affinity.get(dept, [3, 4])
            # Add extra random communities
            extra = random.sample(
                [j for j in range(6) if j not in affinities],
                k=min(2, 6 - len(affinities)),
            )
            member_of = affinities + extra

            for ci in member_of:
                check = await session.execute(
                    text(
                        "SELECT 1 FROM community_members "
                        "WHERE user_id=:u AND community_id=:c"
                    ),
                    {"u": str(users[i]), "c": str(communities[ci])},
                )
                if check.first():
                    continue

                role = "admin" if ci < len(COMMUNITY_DEFS) and COMMUNITY_DEFS[ci][2] == i else "member"
                cm = CommunityMember(
                    user_id=users[i],
                    community_id=communities[ci],
                    role=role,
                    joined_at=now - timedelta(days=random.randint(1, 90)),
                )
                session.add(cm)
                membership_count += 1

        await session.flush()
        print(f"Created {membership_count} community memberships.")

        # ── Posts (80 across 8 categories) ────────────────────
        # Map categories to likely communities
        category_community_map = {
            "academic": [0, 2],      # AI&ML, Software Projects
            "research": [0],         # AI&ML
            "internship": [3],       # Internship Network
            "job": [3, 2],           # Internship Network, Software Projects
            "housing": [5],          # Housing & Roommates
            "event": [4],            # Campus Events
            "marketplace": [4, 5],   # Campus Events, Housing
            "general": [4],          # Campus Events
        }

        # Map categories to likely user departments
        category_dept_map = {
            "academic": ["Computer Engineering", "Software Engineering", "AI Engineering"],
            "research": ["AI Engineering", "Computer Engineering"],
            "internship": ["Software Engineering", "Computer Engineering", "AI Engineering", "Cyber Security", "Business"],
            "job": ["Software Engineering", "Computer Engineering", "Business"],
            "housing": ["Architecture", "Business", "Computer Engineering"],
            "event": None,  # any department
            "marketplace": None,
            "general": None,
        }

        post_ids = []
        post_categories = []
        post_authors = []
        post_count = 0

        for category, posts_list in POST_CONTENT.items():
            comm_choices = category_community_map[category]
            dept_filter = category_dept_map[category]

            # Filter users by department affinity
            if dept_filter:
                eligible_users = [
                    i for i, (_, _, _, dept, _, _) in enumerate(USER_DEFS)
                    if dept in dept_filter
                ]
            else:
                eligible_users = list(range(len(USER_DEFS)))

            for content in posts_list:
                author_idx = random.choice(eligible_users)
                comm_idx = random.choice(comm_choices)

                # Check for duplicate content
                check = await session.execute(
                    text("SELECT id FROM posts WHERE content=:c"),
                    {"c": content},
                )
                if check.first():
                    row = await session.execute(
                        text("SELECT id FROM posts WHERE content=:c"),
                        {"c": content},
                    )
                    pid = row.scalar()
                    post_ids.append(pid)
                    post_categories.append(category)
                    post_authors.append(author_idx)
                    continue

                pid = uuid4()
                p = Post(
                    id=pid,
                    community_id=communities[comm_idx],
                    author_id=users[author_idx],
                    content=content,
                    post_type="text",
                    category=category,
                    is_deleted=False,
                )
                session.add(p)
                post_ids.append(pid)
                post_categories.append(category)
                post_authors.append(author_idx)
                post_count += 1

        await session.flush()
        print(f"Created {post_count} posts across {len(POST_CONTENT)} categories.")

        # ── Jobs ──────────────────────────────────────────────
        job_ids = []
        job_count = 0
        # Assign jobs to users who'd realistically post them
        job_poster_indices = [1, 6, 4, 3, 7, 12, 13, 0, 10, 1, 16, 19, 13, 14, 8, 7, 18, 10, 6, 8]

        for idx, (title, desc, company, location, jtype, skills) in enumerate(JOB_DEFS):
            check = await session.execute(
                text("SELECT id FROM job_posts WHERE title=:t AND company_name=:c"),
                {"t": title, "c": company},
            )
            if check.first():
                row = await session.execute(
                    text("SELECT id FROM job_posts WHERE title=:t AND company_name=:c"),
                    {"t": title, "c": company},
                )
                jid = row.scalar()
                job_ids.append(jid)
                continue

            poster_idx = job_poster_indices[idx % len(job_poster_indices)]
            jid = uuid4()
            full_desc = f"{desc}\n\nRequired Skills: {skills}"
            j = JobPost(
                id=jid,
                author_id=users[poster_idx],
                title=title,
                description=full_desc,
                company_name=company,
                location=location,
                job_type=jtype,
                is_active=True,
            )
            session.add(j)
            job_ids.append(jid)
            job_count += 1

        await session.flush()
        print(f"Created {job_count} job posts.")

        # ── Interactions ──────────────────────────────────────

        # Follows: create a realistic social graph
        follow_count = 0
        for i in range(len(users)):
            # Each user follows 5-12 others
            num_follows = random.randint(5, min(12, len(users) - 1))
            targets = random.sample(
                [j for j in range(len(users)) if j != i], k=num_follows
            )
            for t in targets:
                check = await session.execute(
                    text(
                        "SELECT 1 FROM user_follows "
                        "WHERE follower_id=:f AND following_id=:t"
                    ),
                    {"f": str(users[i]), "t": str(users[t])},
                )
                if check.first():
                    continue
                uf = UserFollow(
                    follower_id=users[i],
                    following_id=users[t],
                    created_at=now - timedelta(days=random.randint(1, 60)),
                )
                session.add(uf)
                follow_count += 1

        await session.flush()
        print(f"Created {follow_count} follows.")

        # Likes: each user likes 10-30 posts
        like_count = 0
        for i in range(len(users)):
            num_likes = random.randint(10, min(30, len(post_ids)))
            liked = random.sample(range(len(post_ids)), k=num_likes)
            for pi in liked:
                if post_authors[pi] == i:
                    continue  # don't like own post
                check = await session.execute(
                    text(
                        "SELECT 1 FROM post_likes "
                        "WHERE user_id=:u AND post_id=:p"
                    ),
                    {"u": str(users[i]), "p": str(post_ids[pi])},
                )
                if check.first():
                    continue
                pl = PostLike(
                    user_id=users[i],
                    post_id=post_ids[pi],
                    created_at=now - timedelta(days=random.randint(0, 30)),
                )
                session.add(pl)
                like_count += 1

        await session.flush()
        print(f"Created {like_count} likes.")

        # Comments: 60 comments distributed across posts
        comment_count = 0
        commented_posts = random.sample(
            range(len(post_ids)), k=min(40, len(post_ids))
        )
        for pi in commented_posts:
            num_comments = random.randint(1, 3)
            for _ in range(num_comments):
                commenter = random.choice(
                    [j for j in range(len(users)) if j != post_authors[pi]]
                )
                template = random.choice(COMMENT_TEMPLATES)
                content = template.format(
                    topic=random.choice(COMMENT_TOPICS)
                ) if "{topic}" in template else template

                cid = uuid4()
                c = Comment(
                    id=cid,
                    post_id=post_ids[pi],
                    author_id=users[commenter],
                    content=content,
                    is_deleted=False,
                )
                session.add(c)
                comment_count += 1

        await session.flush()
        print(f"Created {comment_count} comments.")

        # Saved posts: each user saves 3-8 posts
        save_count = 0
        for i in range(len(users)):
            num_saves = random.randint(3, min(8, len(post_ids)))
            saved = random.sample(range(len(post_ids)), k=num_saves)
            for pi in saved:
                check = await session.execute(
                    text(
                        "SELECT 1 FROM saved_posts "
                        "WHERE user_id=:u AND post_id=:p"
                    ),
                    {"u": str(users[i]), "p": str(post_ids[pi])},
                )
                if check.first():
                    continue
                sp = SavedPost(
                    user_id=users[i],
                    post_id=post_ids[pi],
                    created_at=now - timedelta(days=random.randint(0, 30)),
                )
                session.add(sp)
                save_count += 1

        await session.flush()
        print(f"Created {save_count} saved posts.")

        # Job applications: some users apply to jobs
        app_count = 0
        for i in range(len(users)):
            num_apps = random.randint(1, 4)
            applied = random.sample(range(len(job_ids)), k=min(num_apps, len(job_ids)))
            for ji in applied:
                # Don't apply to own job
                poster_idx = job_poster_indices[ji % len(job_poster_indices)]
                if poster_idx == i:
                    continue
                check = await session.execute(
                    text(
                        "SELECT 1 FROM job_applications "
                        "WHERE job_id=:j AND applicant_id=:a"
                    ),
                    {"j": str(job_ids[ji]), "a": str(users[i])},
                )
                if check.first():
                    continue
                ja = JobApplication(
                    id=uuid4(),
                    job_id=job_ids[ji],
                    applicant_id=users[i],
                    message=f"I'm very interested in this position. My background in {USER_DEFS[i][3]} aligns well with the requirements.",
                    status=random.choice(["pending", "pending", "accepted", "rejected"]),
                )
                session.add(ja)
                app_count += 1

        await session.flush()
        print(f"Created {app_count} job applications.")

        # ── Commit ────────────────────────────────────────────
        await session.commit()

        # ── Summary ───────────────────────────────────────────
        print("\n" + "=" * 50)
        print("  AI Demo Seed — Summary")
        print("=" * 50)
        print(f"  University : Istanbul Rumeli University")
        print(f"  Users      : {len(users)}")
        print(f"  Communities: {len(communities)}")
        print(f"  Posts      : {post_count} (across {len(POST_CONTENT)} categories)")
        for cat in POST_CONTENT:
            print(f"    - {cat:15s}: {len(POST_CONTENT[cat])} posts")
        print(f"  Jobs       : {job_count}")
        print(f"  Memberships: {membership_count}")
        print(f"  Follows    : {follow_count}")
        print(f"  Likes      : {like_count}")
        print(f"  Comments   : {comment_count}")
        print(f"  Saved posts: {save_count}")
        print(f"  Job apps   : {app_count}")
        print("=" * 50)
        print("  Password for all AI demo users: AiDemo2025!")
        print("  Usernames: ai_elif, ai_mert, ai_zeynep, ...")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
