"""
Seed script for UniVerse demo.

Populates the database with demo universities, users, communities,
posts, comments, likes, conversations, and messages so the app
looks alive during a presentation.

Usage:
    cd backend
    python -m scripts.seed_demo

Requires a running PostgreSQL instance and a valid .env file.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from uuid import uuid4
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from app.core.database import engine as async_engine, async_session_factory as async_session
from app.core.security import hash_password
from app.models.base import Base
from app.models.user import User
from app.models.university import University
from app.models.community import Community, CommunityMember
from app.models.post import Post
from app.models.comment import Comment
from app.models.post_like import PostLike
from app.models.conversation import Conversation
from app.models.conversation_participant import ConversationParticipant
from app.models.message import Message
from app.models.notification import Notification


PASSWORD_HASH = hash_password("Demo1234!")


async def seed():
    async with async_session() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT COUNT(*) FROM universities"))
        if result.scalar() > 0:
            print("Database already has data — skipping seed.")
            print("To re-seed, drop and recreate the database first.")
            return

        now = datetime.now(timezone.utc)

        # ── Universities ───────────────────────────────────────
        uni_stanford = University(
            id=uuid4(), name="Stanford University",
            domain="stanford.edu", country="USA",
        )
        uni_mit = University(
            id=uuid4(), name="MIT",
            domain="mit.edu", country="USA",
        )
        session.add_all([uni_stanford, uni_mit])
        await session.flush()

        # ── Users ──────────────────────────────────────────────
        users = []
        user_data = [
            ("alice", "Alice Chen", "alice@stanford.edu", uni_stanford.id,
             "Computer Science", "Senior", "Full-stack dev & coffee addict."),
            ("bob", "Bob Martinez", "bob@stanford.edu", uni_stanford.id,
             "Electrical Engineering", "Junior", "Hardware hacker, software dreamer."),
            ("carol", "Carol Johnson", "carol@stanford.edu", uni_stanford.id,
             "Data Science", "Graduate", "ML researcher by day, gamer by night."),
            ("dave", "Dave Kim", "dave@mit.edu", uni_mit.id,
             "Computer Science", "Sophomore", "Open-source enthusiast."),
            ("eve", "Eve Williams", "eve@stanford.edu", uni_stanford.id,
             "Design", "Senior", "UX designer who codes."),
        ]

        for username, full_name, email, uni_id, dept, year, bio in user_data:
            u = User(
                id=uuid4(), username=username, full_name=full_name,
                email=email, password_hash=PASSWORD_HASH,
                university_id=uni_id, department=dept,
                academic_year=year, bio=bio,
                is_active=True, is_verified_student=True, role="student",
            )
            users.append(u)
            session.add(u)

        await session.flush()
        alice, bob, carol, dave, eve = users

        # ── Communities ────────────────────────────────────────
        communities = []
        comm_data = [
            ("CS Study Group", "Collaborate on CS coursework, share resources, and prep for exams together.",
             uni_stanford.id, alice.id, True),
            ("Startup Hub", "For students building startups. Share ideas, find co-founders, get feedback.",
             uni_stanford.id, bob.id, True),
            ("Photography Club", "Share your best shots! Weekly photo challenges and editing tips.",
             uni_stanford.id, eve.id, True),
            ("ML Research", "Discuss papers, share experiments, and collaborate on ML projects.",
             uni_stanford.id, carol.id, True),
            ("Campus Events", "Stay updated on campus events, workshops, and social gatherings.",
             uni_stanford.id, alice.id, True),
        ]

        for name, desc, uni_id, creator_id, public in comm_data:
            c = Community(
                id=uuid4(), name=name, description=desc,
                university_id=uni_id, created_by=creator_id, is_public=public,
            )
            communities.append(c)
            session.add(c)

        await session.flush()
        cs_group, startup, photo, ml, events = communities

        # ── Community Members ──────────────────────────────────
        memberships = [
            (alice.id, cs_group.id, "admin"), (bob.id, cs_group.id, "member"),
            (carol.id, cs_group.id, "member"), (eve.id, cs_group.id, "member"),
            (bob.id, startup.id, "admin"), (alice.id, startup.id, "member"),
            (dave.id, startup.id, "member"),
            (eve.id, photo.id, "admin"), (alice.id, photo.id, "member"),
            (bob.id, photo.id, "member"),
            (carol.id, ml.id, "admin"), (alice.id, ml.id, "member"),
            (dave.id, ml.id, "member"),
            (alice.id, events.id, "admin"), (bob.id, events.id, "member"),
            (carol.id, events.id, "member"), (eve.id, events.id, "member"),
            (dave.id, events.id, "member"),
        ]

        for user_id, comm_id, role in memberships:
            session.add(CommunityMember(
                user_id=user_id, community_id=comm_id, role=role,
            ))

        await session.flush()

        # ── Posts ───────────────────────────────────────────────
        posts = []
        post_data = [
            (cs_group.id, alice.id,
             "Just finished implementing a red-black tree from scratch! The rotations finally make sense after drawing them out 50 times.",
             None, now - timedelta(hours=8)),
            (cs_group.id, bob.id,
             "Anyone want to form a study group for the algorithms final? Meeting at the library Thursday at 6pm.",
             None, now - timedelta(hours=5)),
            (cs_group.id, carol.id,
             "Sharing my notes on dynamic programming. Covers memoization, tabulation, and common patterns.\n\nLink in comments!",
             None, now - timedelta(hours=3)),
            (startup.id, bob.id,
             "We just got accepted into the campus accelerator! Looking for a frontend developer to join our team. DM me if interested.",
             None, now - timedelta(hours=12)),
            (startup.id, alice.id,
             "Best resources for first-time founders? I've been reading 'The Lean Startup' but looking for more practical advice.",
             None, now - timedelta(hours=6)),
            (photo.id, eve.id,
             "Golden hour at the main quad today was absolutely stunning.",
             "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
             now - timedelta(hours=10)),
            (photo.id, bob.id,
             "Tried long exposure for the first time. The campus fountain looks magical!",
             "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800",
             now - timedelta(hours=4)),
            (ml.id, carol.id,
             "Just published our paper on attention mechanisms in graph neural networks. Incredibly proud of the team!",
             None, now - timedelta(hours=7)),
            (ml.id, dave.id,
             "Has anyone tried the new PyTorch 2.5 features? The compile mode improvements are significant.",
             None, now - timedelta(hours=2)),
            (events.id, alice.id,
             "Hackathon this weekend! 48 hours, free food, great prizes. Register at the CS building lobby.",
             None, now - timedelta(hours=1)),
        ]

        for comm_id, author_id, content, image_url, created in post_data:
            p = Post(
                id=uuid4(), community_id=comm_id, author_id=author_id,
                content=content, image_url=image_url,
            )
            p.created_at = created
            posts.append(p)
            session.add(p)

        await session.flush()

        # ── Comments ───────────────────────────────────────────
        comment_data = [
            (posts[0].id, bob.id, "Nice work! Red-black trees are tricky. AVL trees were easier for me to grasp first."),
            (posts[0].id, carol.id, "Have you tried visualizing it with a tool? I used a BST visualizer and it helped a lot."),
            (posts[1].id, carol.id, "I'm in! See you Thursday."),
            (posts[1].id, eve.id, "Can we do Friday instead? I have a project deadline Thursday."),
            (posts[3].id, alice.id, "Congrats! What does the frontend stack look like?"),
            (posts[3].id, dave.id, "I'm interested! Sending you a DM."),
            (posts[4].id, bob.id, "Zero to One by Peter Thiel is a must-read. Also check out Y Combinator's Startup School."),
            (posts[5].id, alice.id, "This is gorgeous! What camera are you using?"),
            (posts[5].id, bob.id, "Wow, the lighting is perfect."),
            (posts[7].id, alice.id, "Amazing achievement, Carol! Can you share the preprint?"),
            (posts[8].id, carol.id, "Yes! The torch.compile improvements reduced our training time by 30%."),
            (posts[9].id, bob.id, "Count me in! What's the theme this year?"),
            (posts[9].id, eve.id, "I'll be there! Looking for teammates."),
        ]

        for post_id, author_id, content in comment_data:
            session.add(Comment(
                id=uuid4(), post_id=post_id, author_id=author_id, content=content,
            ))

        # ── Post Likes ─────────────────────────────────────────
        like_data = [
            (alice.id, posts[3].id), (alice.id, posts[5].id), (alice.id, posts[7].id),
            (bob.id, posts[0].id), (bob.id, posts[5].id), (bob.id, posts[9].id),
            (carol.id, posts[0].id), (carol.id, posts[1].id), (carol.id, posts[8].id),
            (dave.id, posts[3].id), (dave.id, posts[7].id), (dave.id, posts[9].id),
            (eve.id, posts[0].id), (eve.id, posts[4].id), (eve.id, posts[9].id),
        ]

        for user_id, post_id in like_data:
            session.add(PostLike(user_id=user_id, post_id=post_id))

        # ── Conversations & Messages ──────────────────────────
        conv1_id = uuid4()
        session.add(Conversation(id=conv1_id))
        await session.flush()
        session.add(ConversationParticipant(user_id=alice.id, conversation_id=conv1_id))
        session.add(ConversationParticipant(user_id=bob.id, conversation_id=conv1_id))

        msgs = [
            (conv1_id, bob.id, "Hey Alice! Saw your post about the hackathon. Want to team up?",
             now - timedelta(minutes=45)),
            (conv1_id, alice.id, "Absolutely! I was thinking we could build something with WebSockets.",
             now - timedelta(minutes=40)),
            (conv1_id, bob.id, "That sounds great. I can handle the hardware integration side.",
             now - timedelta(minutes=35)),
            (conv1_id, alice.id, "Perfect combo! Let's meet tomorrow to brainstorm.",
             now - timedelta(minutes=30)),
        ]

        for c_id, sender_id, content, created in msgs:
            m = Message(id=uuid4(), conversation_id=c_id, sender_id=sender_id, content=content)
            m.created_at = created
            session.add(m)

        conv2_id = uuid4()
        session.add(Conversation(id=conv2_id))
        await session.flush()
        session.add(ConversationParticipant(user_id=carol.id, conversation_id=conv2_id))
        session.add(ConversationParticipant(user_id=dave.id, conversation_id=conv2_id))

        msgs2 = [
            (conv2_id, dave.id, "Carol, your GNN paper looks really interesting!",
             now - timedelta(minutes=120)),
            (conv2_id, carol.id, "Thanks Dave! Happy to discuss it if you're interested in collaborating.",
             now - timedelta(minutes=100)),
        ]

        for c_id, sender_id, content, created in msgs2:
            m = Message(id=uuid4(), conversation_id=c_id, sender_id=sender_id, content=content)
            m.created_at = created
            session.add(m)

        # ── Notifications ──────────────────────────────────────
        notif_data = [
            (alice.id, "like", bob.id, posts[0].id, "Bob Martinez liked your post"),
            (alice.id, "comment", carol.id, posts[0].id, "Carol Johnson commented on your post"),
            (bob.id, "like", alice.id, posts[3].id, "Alice Chen liked your post"),
            (bob.id, "comment", dave.id, posts[3].id, "Dave Kim commented on your post"),
            (eve.id, "like", alice.id, posts[5].id, "Alice Chen liked your post"),
            (eve.id, "comment", bob.id, posts[5].id, "Bob Martinez commented on your post"),
        ]

        for user_id, ntype, actor_id, ref_id, content in notif_data:
            session.add(Notification(
                id=uuid4(), user_id=user_id, type=ntype,
                actor_id=actor_id, reference_id=ref_id, content=content,
            ))

        await session.commit()

    print("Demo data seeded successfully!")
    print()
    print("Demo accounts (password: Demo1234!):")
    print("  alice@stanford.edu  — CS Study Group admin")
    print("  bob@stanford.edu    — Startup Hub admin")
    print("  carol@stanford.edu  — ML Research admin")
    print("  dave@mit.edu        — Cross-university user")
    print("  eve@stanford.edu    — Photography Club admin")


if __name__ == "__main__":
    asyncio.run(seed())
