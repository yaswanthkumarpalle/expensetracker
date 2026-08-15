from flask import Flask, render_template, request, session, redirect, url_for
import os
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "development-key")
app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def cal():

    # Create expenses list
    if 'expenses' not in session:
        session['expenses'] = []

    # Get input from user
    if request.method == 'POST':

        expense_name = request.form['expense_name']
        amount = request.form['amount']

        # Store user input
        expense = {
            'name': expense_name,
            'amount': amount
        }

        session['expenses'].append(expense)
        session.modified = True

    # Calculate total
    total = sum(float(expense['amount']) for expense in session['expenses'])

    return render_template(
        'Expense.html',
        expenses=session['expenses'],
        total=total
    )


@app.route('/reset')
def reset():

    session.clear()

    return redirect(url_for('cal'))


if __name__ == '__main__':
    app.run(debug=True)