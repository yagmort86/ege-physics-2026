import os
from flask import Flask, request, jsonify, send_from_directory
from .models import db, bcrypt, User, Progress, Subject
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

def create_app():
    app = Flask(__name__, static_folder='..', static_url_path='/')
    # Use environment variable for database URL (PostgreSQL for Vercel/Supabase)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///platform.db')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')

    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/register', methods=['POST'])
    def register():
        data = request.get_json()
        # Role logic
        existing_user = User.query.first()
        role = 'admin' if not existing_user else 'student'
        is_approved = True if role == 'admin' else False
        
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        new_user = User(name=data['name'], surname=data['surname'], password_hash=hashed_password, role=role, is_approved=is_approved)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User registered"}), 201

    @app.route('/login', methods=['POST'])
    def login():
        data = request.get_json()
        user = User.query.filter_by(name=data['name'], surname=data['surname']).first()
        if user and bcrypt.check_password_hash(user.password_hash, data['password']):
            if not user.is_approved:
                return jsonify({"message": "Account not approved"}), 403
            token = create_access_token(identity=str(user.id))
            return jsonify({"token": token, "role": user.role, "name": f"{user.name} {user.surname}"})
        return jsonify({"message": "Invalid credentials"}), 401

    @app.route('/sync', methods=['POST'])
    @jwt_required()
    def sync():
        user_id = get_jwt_identity()
        data = request.get_json()
        for item in data.get('progress', []):
            new_progress = Progress(
                user_id=user_id,
                subject_id=item['subject_id'],
                task_id=item['task_id'],
                answer=item['answer'],
                is_correct=item['is_correct']
            )
            db.session.add(new_progress)
        db.session.commit()
        return jsonify({"message": "Progress synced"})

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=8080)

