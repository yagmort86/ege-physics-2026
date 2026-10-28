from flask import Flask, request, jsonify, send_from_directory
from models import db, bcrypt, User, Progress
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__, static_folder='..', static_url_path='/')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///platform.db'
app.config['JWT_SECRET_KEY'] = 'super-secret-key' 

db.init_app(app)
bcrypt.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    # Check if admin already exists, if not, first registered user becomes admin
    existing_user = User.query.first()
    role = 'admin' if not existing_user else 'student'
    is_approved = True if role == 'admin' else False # Admin approves students
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(name=data['name'], surname=data['surname'], password_hash=hashed_password, role=role, is_approved=is_approved)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered. Waiting for admin approval." if role == 'student' else "Admin registered."}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(name=data['name'], surname=data['surname']).first()
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        if not user.is_approved:
            return jsonify({"message": "Account not approved by admin"}), 403
        token = create_access_token(identity=str(user.id))
        return jsonify({"token": token, "role": user.role})
    return jsonify({"message": "Invalid credentials"}), 401

@app.route('/subjects', methods=['GET'])
@jwt_required()
def get_subjects():
    subjects = Subject.query.all()
    return jsonify([{"id": s.id, "title": s.title} for s in subjects])

@app.route('/sync', methods=['POST'])
@jwt_required()
def sync():
    user_id = get_jwt_identity()
    data = request.get_json()
    # Логика сохранения прогресса
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

if __name__ == '__main__':
    app.run(debug=True, port=8080)