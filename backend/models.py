from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Float
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    prompts = relationship("Prompt", back_populates="owner")

class Prompt(Base):
    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="prompts")
    versions = relationship("PromptVersion", back_populates="prompt")

class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    id = Column(Integer, primary_key=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"))
    prompt = relationship("Prompt", back_populates="versions")
    content = Column(String, nullable=False)
    model_used = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    evaluations = relationship("Evaluation", back_populates="prompt_version")

class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(Integer, primary_key=True)
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"))
    prompt_version = relationship("PromptVersion", back_populates="evaluations")
    # Store the 9-axis scores as JSON
    scores = Column(JSON, nullable=False)
    # New: Add judge model name to track which model performed the evaluation
    judge_model = Column(String, nullable=False, default="llama-70b")
    # New: Add overall score for quick regression tracking
    overall_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
