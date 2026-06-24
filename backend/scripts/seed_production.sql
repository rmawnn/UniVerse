-- ============================================================
-- UniVerse Production Demo Data Seed
-- Safe to run multiple times (idempotent via ON CONFLICT / IF NOT EXISTS checks)
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Universities ──────────────────────────────────────────────
INSERT INTO universities (id, name, domain, country, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'İstanbul Rumeli Üniversitesi', 'rumeli.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Acıbadem Mehmet Ali Aydınlar Üniversitesi', 'acibadem.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'İstanbul Teknik Üniversitesi', 'itu.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Boğaziçi Üniversitesi', 'boun.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'İstanbul Üniversitesi', 'istanbul.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Orta Doğu Teknik Üniversitesi', 'metu.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Koç Üniversitesi', 'ku.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Hacettepe Üniversitesi', 'hacettepe.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Ankara Üniversitesi', 'ankara.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Gazi Üniversitesi', 'gazi.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'Yeditepe Üniversitesi', 'yeditepe.edu.tr', 'Turkey', now(), now()),
  (gen_random_uuid(), 'İstanbul Medipol Üniversitesi', 'medipol.edu.tr', 'Turkey', now(), now())
ON CONFLICT (domain) DO NOTHING;

-- ── Demo Users (password: AiDemo2025!) ────────────────────────
-- bcrypt hash for AiDemo2025!
DO $$
DECLARE
  v_uni_id uuid;
  v_pw text := '$2b$12$xk31l00iLFEReWI2nnPWLejvbyPdpA0O9OnSf8HVreMALj5jaVjj2';
BEGIN
  -- Get or create IRU university
  SELECT id INTO v_uni_id FROM universities WHERE domain = 'iru.edu.tr';
  IF v_uni_id IS NULL THEN
    INSERT INTO universities (id, name, domain, country, created_at, updated_at)
    VALUES (gen_random_uuid(), 'İstanbul Rumeli Üniversitesi', 'iru.edu.tr', 'Turkey', now(), now())
    RETURNING id INTO v_uni_id;
  END IF;

  -- Create users (skip if username already exists)
  INSERT INTO users (id, email, password_hash, username, full_name, university_id, department, academic_year, bio, skills, is_active, email_verified, is_verified_student, role, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'elif.yilmaz@iru.edu.tr', v_pw, 'ai_elif', 'Elif Yilmaz', v_uni_id, 'Computer Engineering', 3, 'Deep learning researcher, PyTorch enthusiast. Working on NLP for Turkish.', ARRAY['Python','PyTorch','NLP','deep learning','TensorFlow'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'mert.ozkan@iru.edu.tr', v_pw, 'ai_mert', 'Mert Ozkan', v_uni_id, 'Software Engineering', 4, 'Full-stack developer, open-source contributor. React + FastAPI.', ARRAY['React','FastAPI','TypeScript','PostgreSQL','Docker'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'zeynep.demir@iru.edu.tr', v_pw, 'ai_zeynep', 'Zeynep Demir', v_uni_id, 'AI Engineering', 2, 'Computer vision and robotics. Building autonomous systems.', ARRAY['Python','OpenCV','PyTorch','computer vision','ROS'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'baris.kaya@iru.edu.tr', v_pw, 'ai_baris', 'Baris Kaya', v_uni_id, 'Cyber Security', 3, 'Penetration tester, CTF player. Security researcher.', ARRAY['penetration testing','Linux','Burp Suite','Python','network security'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'selin.arslan@iru.edu.tr', v_pw, 'ai_selin', 'Selin Arslan', v_uni_id, 'Business', 4, 'Data-driven marketing, startup founder. Bridging tech and business.', ARRAY['data analysis','SQL','marketing','product management','Excel'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'can.polat@iru.edu.tr', v_pw, 'ai_can', 'Can Polat', v_uni_id, 'Architecture', 2, 'Computational design, parametric modeling. Grasshopper + Python.', ARRAY['Grasshopper','Rhino','Python','parametric design','BIM'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'ayse.celik@iru.edu.tr', v_pw, 'ai_ayse', 'Ayse Celik', v_uni_id, 'Computer Engineering', 4, 'Backend developer, distributed systems. Kubernetes and Go.', ARRAY['Go','Kubernetes','Docker','PostgreSQL','distributed systems'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'emre.sahin@iru.edu.tr', v_pw, 'ai_emre', 'Emre Sahin', v_uni_id, 'Software Engineering', 3, 'Mobile developer, Flutter and SwiftUI. UI/UX enthusiast.', ARRAY['Flutter','Dart','SwiftUI','Firebase','UI/UX'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'deniz.yildiz@iru.edu.tr', v_pw, 'ai_deniz', 'Deniz Yildiz', v_uni_id, 'AI Engineering', 4, 'Reinforcement learning, game AI. Published at AAAI.', ARRAY['Python','PyTorch','reinforcement learning','game AI','research'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'hakan.erdogan@iru.edu.tr', v_pw, 'ai_hakan', 'Hakan Erdogan', v_uni_id, 'Cyber Security', 2, 'Network security, malware analysis. Blue team defender.', ARRAY['SIEM','network security','malware analysis','Linux','Wireshark'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'melis.korkmaz@iru.edu.tr', v_pw, 'ai_melis', 'Melis Korkmaz', v_uni_id, 'Business', 3, 'Product management, agile methodologies. Certified Scrum Master.', ARRAY['product management','Jira','agile','Scrum','user research'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'omer.aksoy@iru.edu.tr', v_pw, 'ai_omer', 'Omer Aksoy', v_uni_id, 'Architecture', 3, 'Sustainable design, BIM specialist. LEED certified.', ARRAY['BIM','Revit','AutoCAD','sustainable design','LEED'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'ipek.turan@iru.edu.tr', v_pw, 'ai_ipek', 'Ipek Turan', v_uni_id, 'Computer Engineering', 2, 'Database systems, data engineering. Apache Spark enthusiast.', ARRAY['Python','SQL','Apache Spark','data engineering','ETL'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'burak.guler@iru.edu.tr', v_pw, 'ai_burak', 'Burak Guler', v_uni_id, 'Software Engineering', 4, 'DevOps engineer, CI/CD pipelines. Terraform and AWS.', ARRAY['AWS','Terraform','Docker','CI/CD','Linux'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'naz.ozturk@iru.edu.tr', v_pw, 'ai_naz', 'Naz Ozturk', v_uni_id, 'AI Engineering', 3, 'NLP researcher, transformer models. Working on multilingual BERT.', ARRAY['Python','HuggingFace','NLP','transformers','BERT'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'kerem.acar@iru.edu.tr', v_pw, 'ai_kerem', 'Kerem Acar', v_uni_id, 'Cyber Security', 4, 'Application security, SAST/DAST tools. Bug bounty hunter.', ARRAY['application security','SAST','DAST','Python','Burp Suite'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'yagmur.sen@iru.edu.tr', v_pw, 'ai_yagmur', 'Yagmur Sen', v_uni_id, 'Business', 2, 'Finance and fintech. Interested in blockchain applications.', ARRAY['finance','Excel','data analysis','blockchain','fintech'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'arda.cetin@iru.edu.tr', v_pw, 'ai_arda', 'Arda Cetin', v_uni_id, 'Architecture', 4, 'Urban planning, GIS analysis. Smart city advocate.', ARRAY['GIS','urban planning','QGIS','Python','data visualization'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'derya.bozkurt@iru.edu.tr', v_pw, 'ai_derya', 'Derya Bozkurt', v_uni_id, 'Computer Engineering', 3, 'Compiler design, programming languages. Rust contributor.', ARRAY['Rust','C++','compiler design','systems programming','LLVM'], true, true, true, 'student', now(), now()),
    (gen_random_uuid(), 'tolga.bulut@iru.edu.tr', v_pw, 'ai_tolga', 'Tolga Bulut', v_uni_id, 'Software Engineering', 2, 'Game developer, Unity and Unreal. XR experiences.', ARRAY['Unity','C#','Unreal Engine','game design','VR/AR'], true, true, true, 'student', now(), now())
  ON CONFLICT (username) DO NOTHING;

  -- ── Communities ──────────────────────────────────────────────
  -- Create 12 Turkish-named communities under IRU
  INSERT INTO communities (id, name, description, university_id, created_by, is_public, is_deleted, created_at, updated_at)
  SELECT gen_random_uuid(), c.name, c.description, v_uni_id, u.id, true, false, now(), now()
  FROM (VALUES
    ('Yazılım Geliştirme Kulübü', 'Kod paylaşımı, proje geliştirme, code review ve açık kaynak katkıları. Her seviyeden yazılımcıya açık.', 'ai_mert'),
    ('Siber Güvenlik Topluluğu', 'CTF yarışmaları, güvenlik haberleri, zafiyet araştırması ve siber güvenlik kariyer yolları.', 'ai_baris'),
    ('Yapay Zekâ ve Veri Bilimi Kulübü', 'Yapay zekâ araştırmaları, ML projeleri, makale okumaları ve AI kariyer tavsiyeleri.', 'ai_elif'),
    ('Girişimcilik Kulübü', 'Startup fikirleri, pitch deck hazırlama, yatırımcı ağları ve girişimcilik deneyimleri.', 'ai_selin'),
    ('Erasmus ve Uluslararası Öğrenciler', 'Erasmus deneyimleri, değişim programları, uluslararası öğrenci yaşamı ve kültürel etkinlikler.', 'ai_can'),
    ('Kariyer ve Staj Fırsatları', 'Staj ilanları, mülakat hazırlığı, CV incelemeleri ve kariyer rehberliği.', 'ai_melis'),
    ('Mobil Uygulama Geliştirme', 'iOS, Android ve cross-platform mobil uygulama geliştirme, Flutter, React Native ve SwiftUI.', 'ai_emre'),
    ('Oyun Geliştirme Kulübü', 'Unity, Unreal Engine, oyun tasarımı ve game jam etkinlikleri.', 'ai_tolga'),
    ('Grafik Tasarım ve UI/UX', 'UI/UX tasarım, Figma, kullanıcı araştırması, prototyping ve görsel tasarım paylaşımları.', 'ai_emre'),
    ('Kitap ve Akademik Paylaşım', 'Kitap önerileri, akademik makale tartışmaları, ders notları ve çalışma grupları.', 'ai_omer'),
    ('Spor ve Sağlıklı Yaşam', 'Kampüs sporları, fitness, sağlıklı beslenme ve takım sporları organizasyonları.', 'ai_can'),
    ('Kampüs Duyuruları', 'Hackathon''lar, workshoplar, seminerler, konuk konuşmacılar ve sosyal etkinlikler.', 'ai_elif')
  ) AS c(name, description, creator_username)
  JOIN users u ON u.username = c.creator_username
  WHERE NOT EXISTS (
    SELECT 1 FROM communities cm WHERE cm.name = c.name AND cm.university_id = v_uni_id
  );

  -- ── Community memberships ──────────────────────────────────
  -- Add all ai_* users to communities they have affinity with
  INSERT INTO community_members (user_id, community_id, role, joined_at)
  SELECT u.id, c.id,
    CASE WHEN c.created_by = u.id THEN 'admin' ELSE 'member' END,
    now() - (random() * interval '90 days')
  FROM users u
  CROSS JOIN communities c
  WHERE u.username LIKE 'ai_%'
    AND c.university_id = v_uni_id
    AND c.name IN (
      'Yazılım Geliştirme Kulübü', 'Siber Güvenlik Topluluğu',
      'Yapay Zekâ ve Veri Bilimi Kulübü', 'Girişimcilik Kulübü',
      'Kariyer ve Staj Fırsatları', 'Kampüs Duyuruları'
    )
  ON CONFLICT (user_id, community_id) DO NOTHING;

  -- ── Job Posts ───────────────────────────────────────────────
  INSERT INTO job_posts (id, author_id, title, description, company_name, location, job_type, is_active, created_at, updated_at)
  SELECT gen_random_uuid(), u.id, j.title, j.description, j.company, j.location, j.jtype, true, now() - (random() * interval '30 days'), now()
  FROM (VALUES
    ('SOC Analyst Intern', 'Monitor security events in our 24/7 SOC, triage alerts, and assist with incident response.\n\nRequired Skills: SIEM, network security, Linux, log analysis, Wireshark', 'SecureNet Turkey', 'Istanbul, Hybrid', 'internship', 'ai_baris'),
    ('Backend Developer Intern', 'Build REST APIs and microservices with Python and FastAPI. Work with PostgreSQL, Redis, and Docker.\n\nRequired Skills: Python, FastAPI, PostgreSQL, Docker, REST APIs', 'TechStart Istanbul', 'Istanbul, On-site', 'internship', 'ai_mert'),
    ('Frontend Developer Intern', 'Build responsive web applications using React and TypeScript. Work closely with UX designers.\n\nRequired Skills: React, TypeScript, Next.js, Tailwind CSS, Git', 'WebCraft Studio', 'Remote', 'internship', 'ai_mert'),
    ('Data Analyst Intern', 'Analyze business data, build dashboards, and generate insights using SQL and Python.\n\nRequired Skills: Python, SQL, pandas, Tableau, data visualization', 'AnalyticsCo', 'Istanbul, Hybrid', 'internship', 'ai_selin'),
    ('AI/ML Intern', 'Work on recommendation systems and NLP pipelines. Train models and help deploy to production.\n\nRequired Skills: Python, PyTorch, scikit-learn, HuggingFace, SQL', 'DataMinds AI', 'Istanbul, On-site', 'internship', 'ai_elif'),
    ('Mobile Developer Intern', 'Develop cross-platform mobile applications with Flutter.\n\nRequired Skills: Flutter, Dart, Firebase, REST APIs, Git', 'PayTech Solutions', 'Istanbul, On-site', 'internship', 'ai_emre'),
    ('Cybersecurity Intern', 'Perform vulnerability assessments and assist with penetration testing.\n\nRequired Skills: Network security, penetration testing, Linux, Python, Burp Suite', 'CyberGuard TR', 'Ankara, On-site', 'internship', 'ai_kerem'),
    ('DevOps Intern', 'Support CI/CD pipelines, manage container orchestration, and automate infrastructure tasks.\n\nRequired Skills: Docker, Kubernetes, Terraform, AWS, CI/CD, Linux', 'CloudFirst', 'Istanbul, Hybrid', 'internship', 'ai_burak'),
    ('UI/UX Design Intern', 'Design user interfaces for web and mobile applications. Conduct user research.\n\nRequired Skills: Figma, user research, prototyping, wireframing, Sketch', 'DesignHub Agency', 'Istanbul, On-site', 'internship', 'ai_emre'),
    ('Software QA Intern', 'Write automated tests, perform manual testing, and improve the CI test pipeline.\n\nRequired Skills: Python, Selenium, API testing, CI/CD, SQL', 'TestPro Software', 'Istanbul, Hybrid', 'internship', 'ai_ayse'),
    ('Full-Stack Developer', 'Work on frontend (React) and backend (Node.js) of our SaaS platform.\n\nRequired Skills: React, Node.js, TypeScript, MongoDB, AWS', 'SaaSify', 'Remote', 'full-time', 'ai_mert'),
    ('Game Developer', 'Unity development for mobile games. Gameplay systems and performance optimization.\n\nRequired Skills: Unity, C#, game design, mobile development, Git', 'PlayMakers Studio', 'Istanbul, On-site', 'full-time', 'ai_tolga'),
    ('NLP Research Assistant', 'Work on Turkish language processing tasks including text classification and NER. Part-time.\n\nRequired Skills: Python, HuggingFace Transformers, NLP, PyTorch', 'University AI Lab', 'Istanbul, On-site', 'part-time', 'ai_naz'),
    ('Computer Vision Engineer', 'Develop image processing pipelines for autonomous drone navigation.\n\nRequired Skills: Python, OpenCV, PyTorch, YOLO, embedded systems', 'DroneVision', 'Istanbul, On-site', 'full-time', 'ai_zeynep'),
    ('Cloud Solutions Intern', 'Help customers migrate to cloud infrastructure. Learn AWS services hands-on.\n\nRequired Skills: AWS, Linux, networking, Python, cloud architecture', 'AWS Partner Co', 'Ankara, On-site', 'internship', 'ai_burak'),
    ('AI/ML Intern — Computer Vision', 'Work on medical image analysis using deep learning.\n\nRequired Skills: Python, PyTorch, computer vision, deep learning, medical imaging', 'HealthAI', 'Istanbul, On-site', 'internship', 'ai_deniz'),
    ('Backend Developer (Go)', 'Build high-performance microservices in Go for payment processing.\n\nRequired Skills: Go, gRPC, PostgreSQL, Redis, Docker, Kafka', 'FinFlow', 'Istanbul, On-site', 'full-time', 'ai_ayse'),
    ('Product Management Intern', 'Help define product roadmaps and coordinate between engineering and design.\n\nRequired Skills: Product management, analytics, Jira, user research, SQL', 'StartupXYZ', 'Istanbul, Hybrid', 'internship', 'ai_melis'),
    ('Embedded Systems Developer', 'Firmware development for IoT devices using C/C++ and RTOS.\n\nRequired Skills: C, C++, RTOS, embedded systems, IoT protocols', 'IoTech Solutions', 'Ankara, On-site', 'full-time', 'ai_derya'),
    ('Blockchain Developer Intern', 'Smart contract development on Ethereum and Solana.\n\nRequired Skills: Solidity, Rust, Web3.js, blockchain, smart contracts', 'CryptoLab Turkey', 'Istanbul, Remote', 'internship', 'ai_yagmur')
  ) AS j(title, description, company, location, jtype, poster_username)
  JOIN users u ON u.username = j.poster_username
  WHERE NOT EXISTS (
    SELECT 1 FROM job_posts jp WHERE jp.title = j.title AND jp.company_name = j.company
  );

END $$;

-- ── Posts (40+ across communities) ───────────────────────────────
-- Insert posts with categories so AI categorization is visible
DO $$
DECLARE
  v_uni_id uuid;
BEGIN
  SELECT id INTO v_uni_id FROM universities WHERE domain = 'iru.edu.tr';

  -- Insert posts distributed across communities and categories
  INSERT INTO posts (id, community_id, author_id, content, post_type, category, is_deleted, created_at, updated_at)
  SELECT gen_random_uuid(), c.id, u.id, p.content, 'text', p.category, false,
         now() - (p.hours_ago * interval '1 hour'), now()
  FROM (VALUES
    ('Yapay Zekâ ve Veri Bilimi Kulübü', 'ai_elif', 'academic', 'Just finished my thesis proposal on distributed consensus algorithms. My advisor suggested focusing on Byzantine fault tolerance in heterogeneous networks. Any recommendations for recent papers?', 8),
    ('Yapay Zekâ ve Veri Bilimi Kulübü', 'ai_naz', 'research', 'Our lab just got accepted to CVPR 2025! Paper on self-supervised learning for medical image segmentation. Happy to share a preprint with anyone interested.', 12),
    ('Yapay Zekâ ve Veri Bilimi Kulübü', 'ai_elif', 'research', 'Interesting finding: fine-tuning a 1.5B parameter model with LoRA achieves 94% of full fine-tuning performance at 1/10th the compute cost. Running more ablations this week.', 6),
    ('Yapay Zekâ ve Veri Bilimi Kulübü', 'ai_deniz', 'academic', 'Just read the Mamba paper on selective state spaces. This could be a real alternative to transformers for long-sequence modeling. Anyone want to discuss?', 4),
    ('Yapay Zekâ ve Veri Bilimi Kulübü', 'ai_zeynep', 'research', 'Running experiments on contrastive learning for recommendation systems. Current results show 15% improvement over collaborative filtering baselines.', 18),
    ('Yazılım Geliştirme Kulübü', 'ai_mert', 'academic', 'Study group for BLG312 Computer Architecture final exam this Thursday at the library, 3rd floor. Bringing past exam solutions and summary notes. Everyone welcome!', 24),
    ('Yazılım Geliştirme Kulübü', 'ai_ayse', 'academic', 'Completed the Stanford CS229 machine learning course on Coursera. Highly recommend it if you want a solid foundation before taking our university''s ML class.', 15),
    ('Yazılım Geliştirme Kulübü', 'ai_derya', 'academic', 'Can someone recommend a good textbook for Operating Systems? I''ve heard Tanenbaum is the standard but Silberschatz seems more practical.', 20),
    ('Yazılım Geliştirme Kulübü', 'ai_ipek', 'academic', 'Our capstone project team needs a 4th member with database experience. We''re building a real-time analytics dashboard using PostgreSQL and TimescaleDB.', 3),
    ('Yazılım Geliştirme Kulübü', 'ai_mert', 'technology', 'Has anyone tried the new PyTorch 2.5 features? The compile mode improvements are significant for training speed.', 9),
    ('Kariyer ve Staj Fırsatları', 'ai_burak', 'internship', 'Just got my summer internship offer from Google! Applied to the SWE intern position in Zurich. Happy to share my interview experience and preparation strategy.', 48),
    ('Kariyer ve Staj Fırsatları', 'ai_selin', 'internship', 'Amazon Web Services is hiring intern cloud architects for Summer 2025. The application deadline is March 15. They specifically mentioned wanting students with Kubernetes experience.', 36),
    ('Kariyer ve Staj Fırsatları', 'ai_kerem', 'internship', 'Completed my internship at a cybersecurity startup. Learned more in 3 months than in a full semester. If you get a chance to work at a startup, take it!', 72),
    ('Kariyer ve Staj Fırsatları', 'ai_mert', 'career', 'Hiring a junior backend developer at our startup. Stack: Python, FastAPI, PostgreSQL, Docker. Remote-friendly, competitive salary. DM for the job description.', 24),
    ('Kariyer ve Staj Fırsatları', 'ai_melis', 'internship', 'University career center is organizing an internship fair next Wednesday. Over 30 companies confirmed including Siemens, Bosch, and several local tech startups.', 10),
    ('Kariyer ve Staj Fırsatları', 'ai_ayse', 'career', 'Graduation is 2 months away and I just accepted a full-time offer at Trendyol as a data engineer! The interview process had 4 rounds over 3 weeks.', 60),
    ('Siber Güvenlik Topluluğu', 'ai_baris', 'technology', 'Free workshop: Introduction to Docker and Container Orchestration. Saturday 10 AM - 4 PM at the tech lab. Bring your laptop. Lunch provided.', 5),
    ('Siber Güvenlik Topluluğu', 'ai_hakan', 'event', 'Cybersecurity workshop: hands-on CTF challenge for beginners. Learn web exploitation, reverse engineering, and cryptography basics. No experience required.', 8),
    ('Siber Güvenlik Topluluğu', 'ai_kerem', 'technology', 'New zero-day in popular WordPress plugin affecting 2M+ sites. Patch is available — update immediately if you''re running WP.', 2),
    ('Kampüs Duyuruları', 'ai_elif', 'event', 'HackIRU 2025 — 48-hour hackathon on campus! Theme: sustainable tech solutions. Prizes worth 50K TL. Teams of 3-5 people. Registration opens next Monday.', 7),
    ('Kampüs Duyuruları', 'ai_mert', 'event', 'Guest lecture: Dr. Sarah Chen from DeepMind will talk about Scaling Laws in Large Language Models this Friday at 2 PM in the main auditorium. Do not miss it!', 14),
    ('Kampüs Duyuruları', 'ai_selin', 'event', 'Student startup demo day! 8 teams will pitch their projects to a panel of investors and industry experts. Come support your classmates. Friday at 6 PM.', 20),
    ('Kampüs Duyuruları', 'ai_can', 'event', 'End-of-semester concert at the campus amphitheater! Student bands performing, food trucks, and a DJ. Free entry with student ID. Saturday evening.', 30),
    ('Kampüs Duyuruları', 'ai_omer', 'announcement', 'Photography exhibition by Architecture students in the campus gallery. Opening reception Thursday evening with free food and drinks. Showcasing 30+ works.', 16),
    ('Kampüs Duyuruları', 'ai_melis', 'event', 'AI Ethics debate night: Should autonomous weapons be banned? Featuring professors from CS, Philosophy, and Political Science departments. Thursday 7 PM.', 11),
    ('Girişimcilik Kulübü', 'ai_selin', 'career', 'Best resources for first-time founders? I''ve been reading The Lean Startup but looking for more practical advice.', 22),
    ('Girişimcilik Kulübü', 'ai_yagmur', 'technology', 'Blockchain in education: Has anyone explored using smart contracts for credential verification? Could be interesting for UniVerse.', 40),
    ('Girişimcilik Kulübü', 'ai_melis', 'career', 'Product management tip: Use the RICE framework for feature prioritization. Reach x Impact x Confidence / Effort. Changed how our startup makes decisions.', 15),
    ('Mobil Uygulama Geliştirme', 'ai_emre', 'technology', 'Flutter 3.22 is out with Impeller renderer for Android. Performance improvements are impressive — tested on a low-end Samsung and it''s noticeably smoother.', 9),
    ('Mobil Uygulama Geliştirme', 'ai_tolga', 'technology', 'Built a simple AR app with ARKit in 2 hours. Apple''s documentation has gotten much better. Thinking of building a campus navigation AR overlay.', 14),
    ('Oyun Geliştirme Kulübü', 'ai_tolga', 'technology', 'Unity 6 performance benchmarks vs Unreal 5.4 for mobile games. Surprisingly close! Unity still wins on build size and iteration speed.', 28),
    ('Oyun Geliştirme Kulübü', 'ai_deniz', 'academic', 'Game AI paper reading group starts next week. First paper: Monte Carlo Tree Search in real-time strategy games. Wednesday 6 PM at Lab 201.', 5),
    ('Grafik Tasarım ve UI/UX', 'ai_emre', 'technology', 'Figma Config highlights: auto-layout improvements and the new slide deck feature. Might replace Google Slides for our presentations.', 33),
    ('Grafik Tasarım ve UI/UX', 'ai_can', 'academic', 'Color theory crash course: Understanding HSL vs HSB and when to use each. Wrote a blog post with interactive examples. Link in comments!', 18),
    ('Kitap ve Akademik Paylaşım', 'ai_omer', 'academic', 'Created a benchmark dataset for Turkish NLP tasks. 50K annotated sentences across sentiment, NER, and POS tagging. Will release on HuggingFace next month.', 44),
    ('Kitap ve Akademik Paylaşım', 'ai_naz', 'academic', 'Writing a literature review on federated learning. Found 40+ papers but need help narrowing down to the most impactful ones. Suggestions?', 26),
    ('Spor ve Sağlıklı Yaşam', 'ai_can', 'social', 'Annual sports tournament starts next week. Sign up for basketball, volleyball, or table tennis. Register at the student affairs office by Wednesday.', 50),
    ('Spor ve Sağlıklı Yaşam', 'ai_arda', 'social', 'Who''s going to the football game this Saturday? We''re playing against Marmara University. Would be great to have a big student section!', 12),
    ('Erasmus ve Uluslararası Öğrenciler', 'ai_can', 'social', 'Erasmus info session for Spring 2026 applications. Learn about partner universities, scholarships, and the application process. Tuesday 3 PM Room 102.', 38),
    ('Erasmus ve Uluslararası Öğrenciler', 'ai_arda', 'social', 'Looking for someone who did Erasmus in Germany. Have questions about TU Munich''s computer science program and student life in Munich.', 55)
  ) AS p(community_name, author_username, category, content, hours_ago)
  JOIN communities c ON c.name = p.community_name AND c.university_id = v_uni_id
  JOIN users u ON u.username = p.author_username
  WHERE NOT EXISTS (
    SELECT 1 FROM posts ps WHERE ps.content = p.content AND ps.is_deleted = false
  );

  -- ── Comments on posts ────────────────────────────────────────
  INSERT INTO comments (id, post_id, author_id, content, is_deleted, created_at, updated_at)
  SELECT gen_random_uuid(), ps.id, u.id, cm.content, false, ps.created_at + interval '1 hour', now()
  FROM (
    SELECT p.id, p.created_at, p.content AS post_content, ROW_NUMBER() OVER (ORDER BY p.created_at) AS rn
    FROM posts p WHERE p.is_deleted = false
    ORDER BY p.created_at DESC LIMIT 30
  ) ps
  CROSS JOIN LATERAL (VALUES
    ('Great post! Thanks for sharing this.', 'ai_mert'),
    ('This is really helpful, I was looking for exactly this information.', 'ai_elif'),
    ('Interesting perspective. Can you share more details?', 'ai_zeynep')
  ) AS cm(content, commenter)
  JOIN users u ON u.username = cm.commenter
  WHERE ps.rn <= 20
    AND NOT EXISTS (
      SELECT 1 FROM comments c2 WHERE c2.post_id = ps.id AND c2.author_id = u.id AND c2.content = cm.content
    )
  LIMIT 60;

  -- ── Post likes ────────────────────────────────────────────────
  INSERT INTO post_likes (user_id, post_id, created_at)
  SELECT u.id, p.id, p.created_at + interval '30 minutes'
  FROM users u
  CROSS JOIN (SELECT id, created_at FROM posts WHERE is_deleted = false ORDER BY created_at DESC LIMIT 40) p
  WHERE u.username LIKE 'ai_%'
    AND random() < 0.3
  ON CONFLICT (user_id, post_id) DO NOTHING;

  -- ── User follows ──────────────────────────────────────────────
  INSERT INTO user_follows (follower_id, following_id, created_at)
  SELECT u1.id, u2.id, now() - (random() * interval '60 days')
  FROM users u1
  CROSS JOIN users u2
  WHERE u1.username LIKE 'ai_%'
    AND u2.username LIKE 'ai_%'
    AND u1.id != u2.id
    AND random() < 0.4
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- ── AI Usage Logs (demo activity) ────────────────────────────
  INSERT INTO ai_usage_logs (id, user_id, feature, provider, latency_ms, success, created_at)
  SELECT gen_random_uuid(), u.id, f.feature, f.provider, f.latency_ms, f.success,
         now() - (f.hours_ago * interval '1 hour')
  FROM (VALUES
    ('categorization', 'Gemini', 142, true, 1, 'ai_elif'),
    ('categorization', 'Gemini', 156, true, 2, 'ai_mert'),
    ('categorization', 'Gemini', 138, true, 3, 'ai_zeynep'),
    ('categorization', 'Gemini', 201, true, 5, 'ai_naz'),
    ('categorization', 'Gemini', 167, true, 7, 'ai_deniz'),
    ('categorization', 'Gemini', 189, true, 10, 'ai_baris'),
    ('categorization', 'Gemini', 145, true, 12, 'ai_ayse'),
    ('categorization', 'RuleBased (fallback)', 3, false, 15, 'ai_selin'),
    ('categorization', 'Gemini', 178, true, 18, 'ai_ipek'),
    ('categorization', 'Gemini', 163, true, 24, 'ai_emre'),
    ('categorization', 'Gemini', 151, true, 30, 'ai_hakan'),
    ('categorization', 'Gemini', 195, true, 36, 'ai_derya'),
    ('categorization', 'Gemini', 172, true, 48, 'ai_tolga'),
    ('categorization', 'Gemini', 184, true, 60, 'ai_kerem'),
    ('categorization', 'Gemini', 159, true, 72, 'ai_omer'),
    ('recommendation', 'weighted_multi_signal', 45, true, 2, 'ai_elif'),
    ('recommendation', 'weighted_multi_signal', 52, true, 4, 'ai_mert'),
    ('recommendation', 'weighted_multi_signal', 38, true, 8, 'ai_zeynep'),
    ('recommendation', 'weighted_multi_signal', 61, true, 14, 'ai_baris'),
    ('recommendation', 'weighted_multi_signal', 43, true, 20, 'ai_selin'),
    ('recommendation', 'weighted_multi_signal', 56, true, 28, 'ai_naz'),
    ('recommendation', 'weighted_multi_signal', 49, true, 40, 'ai_ayse'),
    ('recommendation', 'weighted_multi_signal', 41, true, 55, 'ai_deniz'),
    ('recommendation', 'weighted_multi_signal', 58, true, 68, 'ai_emre'),
    ('recommendation', 'weighted_multi_signal', 47, true, 80, 'ai_hakan'),
    ('job_matching', 'skill_factor_scoring', 28, true, 3, 'ai_elif'),
    ('job_matching', 'skill_factor_scoring', 31, true, 6, 'ai_mert'),
    ('job_matching', 'skill_factor_scoring', 25, true, 11, 'ai_zeynep'),
    ('job_matching', 'skill_factor_scoring', 34, true, 16, 'ai_baris'),
    ('job_matching', 'skill_factor_scoring', 29, true, 22, 'ai_burak'),
    ('job_matching', 'skill_factor_scoring', 26, true, 35, 'ai_naz'),
    ('job_matching', 'skill_factor_scoring', 33, true, 44, 'ai_kerem'),
    ('job_matching', 'skill_factor_scoring', 27, true, 56, 'ai_ipek'),
    ('job_matching', 'skill_factor_scoring', 30, true, 70, 'ai_derya'),
    ('job_matching', 'skill_factor_scoring', 32, true, 84, 'ai_tolga')
  ) AS f(feature, provider, latency_ms, success, hours_ago, username)
  JOIN users u ON u.username = f.username
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_usage_logs a WHERE a.user_id = u.id AND a.feature = f.feature
    AND a.created_at > now() - interval '7 days'
  );

END $$;

-- ── Verify counts ──────────────────────────────────────────────
SELECT 'universities' AS entity, COUNT(*) AS count FROM universities
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'communities', COUNT(*) FROM communities
UNION ALL SELECT 'community_members', COUNT(*) FROM community_members
UNION ALL SELECT 'posts', COUNT(*) FROM posts WHERE is_deleted = false
UNION ALL SELECT 'comments', COUNT(*) FROM comments WHERE is_deleted = false
UNION ALL SELECT 'job_posts', COUNT(*) FROM job_posts WHERE is_active = true
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'ai_usage_logs', COUNT(*) FROM ai_usage_logs
ORDER BY entity;
