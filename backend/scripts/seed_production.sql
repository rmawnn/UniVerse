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
  v_pw text := '$2b$12$LJ3m4ys4yBNOmqMYaNU2/.nOBOBgFSAkjmGDsGOaM1Rv/W.4CxTW';
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
