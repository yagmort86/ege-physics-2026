from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    surname = db.Column(db.String(50), nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='student') # student, admin
    is_approved = db.Column(db.Boolean, default=False) # Protection against registration abuse

class Subject(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(100), nullable=False)

class Progress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subject_id = db.Column(db.String(50), nullable=False) # 'physics', 'algebra', etc.
    task_id = db.Column(db.String(50), nullable=False)
    answer = db.Column(db.String(255))
    is_correct = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())
