from flask import Blueprint, jsonify, request
from datetime import datetime, timezone

family_bp = Blueprint("family", __name__)

VALID_STATUSES = {"safe", "help", "unknown"}

db = None
FamilyMember = None


def init_family_models(sqlalchemy_db):
    """Called once from app.py with the shared SQLAlchemy instance so this
    module's model attaches to the same db/session as the rest of the app."""
    global db, FamilyMember
    db = sqlalchemy_db

    class _FamilyMember(db.Model):
        __tablename__ = "family_member"
        id = db.Column(db.Integer, primary_key=True)
        family_code = db.Column(db.String(32), nullable=False, index=True)
        name = db.Column(db.String(64), nullable=False)
        status = db.Column(db.String(16), nullable=False, default="unknown")
        updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

        __table_args__ = (
            db.UniqueConstraint("family_code", "name", name="uq_family_member"),
        )

        def to_dict(self):
            return {
                "name": self.name,
                "status": self.status,
                "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            }

    FamilyMember = _FamilyMember


def _normalize_code(code: str) -> str:
    return (code or "").strip().upper()[:32]


def _normalize_name(name: str) -> str:
    return (name or "").strip()[:64]


@family_bp.route("/api/family/join", methods=["POST"])
def join_family():
    payload = request.get_json(silent=True) or {}
    code = _normalize_code(payload.get("code"))
    name = _normalize_name(payload.get("name"))

    if not code or not name:
        return jsonify({"error": "name and code are required"}), 400

    member = FamilyMember.query.filter_by(family_code=code, name=name).first()
    if member is None:
        member = FamilyMember(family_code=code, name=name, status="unknown")
        db.session.add(member)
        db.session.commit()

    members = (
        FamilyMember.query.filter_by(family_code=code)
        .order_by(FamilyMember.name.asc())
        .all()
    )
    return jsonify({"code": code, "members": [m.to_dict() for m in members]})


@family_bp.route("/api/family/<code>/members", methods=["GET"])
def get_family_members(code):
    code = _normalize_code(code)
    members = (
        FamilyMember.query.filter_by(family_code=code)
        .order_by(FamilyMember.name.asc())
        .all()
    )
    return jsonify({"code": code, "members": [m.to_dict() for m in members]})


@family_bp.route("/api/family/<code>/status", methods=["POST"])
def update_status(code):
    code = _normalize_code(code)
    payload = request.get_json(silent=True) or {}
    name = _normalize_name(payload.get("name"))
    status = (payload.get("status") or "").strip().lower()

    if not name or status not in VALID_STATUSES:
        return jsonify({"error": "valid name and status (safe|help|unknown) required"}), 400

    member = FamilyMember.query.filter_by(family_code=code, name=name).first()
    if member is None:
        member = FamilyMember(family_code=code, name=name, status=status)
        db.session.add(member)
    else:
        member.status = status
        member.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    members = (
        FamilyMember.query.filter_by(family_code=code)
        .order_by(FamilyMember.name.asc())
        .all()
    )
    return jsonify({"code": code, "members": [m.to_dict() for m in members]})
