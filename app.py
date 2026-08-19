import os
import sqlite3
from datetime import date
from math import isfinite
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "expense-tracker-dev-key")
DATABASE = os.path.join(app.root_path, "expenses.db")
SCHEMA_PATH = os.path.join(app.root_path, "schema.sql")

PREDEFINED_CATEGORIES = [
    "Food", "Travelling", "Groceries", "Shopping",
    "Entertainment", "Medical", "Education", "Bills", "Other"
]


def get_text(data, key):
    value = data.get(key, "")
    return value.strip() if isinstance(value, str) else ""


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        conn = get_db_connection()
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()
        conn.close()

# Ensure database table exists
init_db()

@app.route("/")
def index():
    return render_template("index.html", categories=PREDEFINED_CATEGORIES)

@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    target_date = request.args.get("date", date.today().isoformat())
    conn = get_db_connection()
    expenses = conn.execute(
        "SELECT * FROM expenses WHERE date = ? ORDER BY id DESC", (target_date,)
    ).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in expenses])

@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400
    
    category = get_text(data, "category")
    description = get_text(data, "description")
    amount = data.get("amount")
    expense_date = get_text(data, "date") or date.today().isoformat()
    notes = get_text(data, "notes")

    # Edge Case Validations
    if not category or category not in PREDEFINED_CATEGORIES:
        return jsonify({"error": "Please select a valid expense category."}), 400
    
    if not description:
        return jsonify({"error": "Expense description cannot be empty."}), 400

    try:
        amount = float(amount)
        if not isfinite(amount) or amount <= 0:
            return jsonify({"error": "Amount must be greater than ₹0."}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid amount format. Enter a valid number."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO expenses (category, description, amount, date, notes) VALUES (?, ?, ?, ?, ?)",
        (category, description, amount, expense_date, notes)
    )
    conn.commit()
    new_id = cursor.lastrowid
    
    new_expense = conn.execute("SELECT * FROM expenses WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    return jsonify(dict(new_expense)), 201

@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()

    if rows_affected == 0:
        return jsonify({"error": "Expense not found."}), 404

    return jsonify({"message": "Expense deleted successfully."}), 200


@app.route("/api/expenses", methods=["DELETE"])
def clear_expenses():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses")
    conn.commit()
    deleted_count = cursor.rowcount
    conn.close()

    return jsonify({"message": "All expenses cleared successfully.", "deleted_count": deleted_count}), 200

@app.route("/api/calculate", methods=["GET"])
def calculate_expenses():
    target_date = request.args.get("date", date.today().isoformat())
    conn = get_db_connection()
    
    # Category totals
    rows = conn.execute(
        """
        SELECT category, SUM(amount) as category_total
        FROM expenses
        WHERE date = ?
        GROUP BY category
        """,
        (target_date,)
    ).fetchall()
    conn.close()

    category_totals = {cat: 0.0 for cat in PREDEFINED_CATEGORIES}
    overall_total = 0.0

    for row in rows:
        cat = row["category"]
        tot = float(row["category_total"])
        category_totals[cat] = tot
        overall_total += tot

    # Handle Division by Zero Edge Case
    analysis = []
    top_category = None
    max_amount = -1

    for cat in PREDEFINED_CATEGORIES:
        amt = category_totals[cat]
        pct = (amt / overall_total * 100) if overall_total > 0 else 0.0
        
        if amt > max_amount and amt > 0:
            max_amount = amt
            top_category = cat

        analysis.append({
            "category": cat,
            "amount": round(amt, 2),
            "percentage": round(pct, 2)
        })

    return jsonify({
        "overall_total": round(overall_total, 2),
        "category_breakdown": analysis,
        "top_spending_category": top_category
    })

if __name__ == "__main__":
    app.run(debug=True)
