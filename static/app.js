document.addEventListener("DOMContentLoaded", () => {
  const filterDateInput = document.getElementById("filter-date");
  const expenseDateInput = document.getElementById("expense-date");
  const expenseForm = document.getElementById("expense-form");
  const alertBox = document.getElementById("alert-box");
  const expenseTableBody = document.getElementById("expense-table-body");
  const calculateBtn = document.getElementById("calculate-btn");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const formTitle = document.getElementById("expense-form-title");
  const submitExpenseBtn = document.getElementById("submit-expense-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const resultsSection = document.getElementById("results-section");
  const totalSpendingEl = document.getElementById("total-spending");
  const topCategoryEl = document.getElementById("top-category");
  const categoryProgressList = document.getElementById("category-progress-list");

  let chartInstance = null;
  let editingExpenseId = null;

  // Initialize dates with today's date
  const today = new Date().toISOString().split("T")[0];
  filterDateInput.value = today;
  expenseDateInput.value = today;

  // Fetch expenses for current date selection
  fetchExpenses();

  filterDateInput.addEventListener("change", () => {
    fetchExpenses();
    resultsSection.classList.add("hidden");
  });

  // Handle Form Submission
  expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const payload = {
      category: document.getElementById("category").value,
      description: document.getElementById("description").value,
      amount: document.getElementById("amount").value,
      date: expenseDateInput.value,
      notes: document.getElementById("notes").value
    };

    try {
      const isEditing = editingExpenseId !== null;
      const res = await fetch(isEditing ? `/api/expenses/${editingExpenseId}` : "/api/expenses", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || "Failed to submit expense.", "error");
        return;
      }

      showAlert(isEditing ? "Expense updated successfully!" : "Expense added successfully!", "success");
      resetExpenseForm();
      
      // Instantly refresh expenses
      fetchExpenses();
    } catch (err) {
      showAlert("Network error occurred.", "error");
    }
  });

  // Handle Calculate Button Click
  calculateBtn.addEventListener("click", calculateExpenses);

  clearAllBtn.addEventListener("click", async () => {
    if (!confirm("Clear all saved expenses? This cannot be undone.")) return;

    try {
      const res = await fetch("/api/expenses", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || "Unable to clear expenses.", "error");
        return;
      }

      showAlert("All expenses have been cleared.", "success");
      resultsSection.classList.add("hidden");
      fetchExpenses();
    } catch (err) {
      showAlert("Network error occurred.", "error");
    }
  });

  cancelEditBtn.addEventListener("click", () => {
    resetExpenseForm();
    hideAlert();
  });

  async function fetchExpenses() {
    const selectedDate = filterDateInput.value;
    try {
      const res = await fetch(`/api/expenses?date=${selectedDate}`);
      const expenses = await res.json();

      renderExpenseTable(expenses);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  }

  function renderExpenseTable(expenses) {
    expenseTableBody.innerHTML = "";

    if (expenses.length === 0) {
      expenseTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-6 text-center text-slate-500">
            No expenses found for this date.
          </td>
        </tr>`;
      return;
    }

    expenses.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-indigo-200 transition-colors";
      tr.innerHTML = `
        <td class="px-4 py-3 font-medium text-black">${escapeHtml(item.category)}</td>
        <td class="px-4 py-3">
          <div>${escapeHtml(item.description)}</div>
          ${item.notes ? `<div class="text-xs text-slate-500">${escapeHtml(item.notes)}</div>` : ""}
        </td>
        <td class="px-4 py-3 font-semibold text-emerald-400">₹${item.amount.toFixed(2)}</td>
        <td class="px-4 py-3">
          <div class="flex gap-3">
            <button type="button" class="edit-expense-btn text-indigo-600 hover:text-indigo-800 font-medium text-xs">Edit</button>
            <button type="button" class="delete-expense-btn text-rose-500 hover:text-rose-700 font-medium text-xs">Delete</button>
          </div>
        </td>
      `;
      tr.querySelector(".edit-expense-btn").addEventListener("click", () => startEdit(item));
      tr.querySelector(".delete-expense-btn").addEventListener("click", () => window.deleteExpense(item.id));
      expenseTableBody.appendChild(tr);
    });
  }

  window.deleteExpense = async function (id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchExpenses();
        if (!resultsSection.classList.contains("hidden")) {
          calculateExpenses();
        }
      }
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  function startEdit(item) {
    editingExpenseId = item.id;
    document.getElementById("category").value = item.category;
    document.getElementById("description").value = item.description;
    document.getElementById("amount").value = item.amount;
    expenseDateInput.value = item.date;
    document.getElementById("notes").value = item.notes || "";
    formTitle.textContent = "Edit Expense";
    submitExpenseBtn.textContent = "Save Changes";
    cancelEditBtn.classList.remove("hidden");
    hideAlert();
    expenseForm.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("description").focus();
  }

  function resetExpenseForm() {
    editingExpenseId = null;
    expenseForm.reset();
    expenseDateInput.value = filterDateInput.value;
    formTitle.textContent = "Add Expense";
    submitExpenseBtn.textContent = "Submit Expense";
    cancelEditBtn.classList.add("hidden");
  }

  async function calculateExpenses() {
    const selectedDate = filterDateInput.value;
    try {
      const res = await fetch(`/api/calculate?date=${selectedDate}`);
      const data = await res.json();

      // Display Total & High-spending category
      totalSpendingEl.textContent = `₹${data.overall_total.toFixed(2)}`;
      topCategoryEl.textContent = data.top_spending_category || "None";

      renderProgressBars(data.category_breakdown);
      renderChart(data.category_breakdown);

      resultsSection.classList.remove("hidden");
    } catch (err) {
      console.error("Error calculating expenses:", err);
    }
  }

  function renderProgressBars(breakdown) {
    categoryProgressList.innerHTML = "";

    // Sort to show non-zero spending first
    const sorted = [...breakdown].sort((a, b) => b.amount - a.amount);

    sorted.forEach((item) => {
      if (item.amount === 0) return; // Hide 0 spending from visual bars

      const wrapper = document.createElement("div");
      wrapper.className = "space-y-1";
      wrapper.innerHTML = `
        <div class="flex justify-between text-sm font-medium">
          <span class="text-slate-300">${escapeHtml(item.category)}</span>
          <span class="text-slate-400">₹${item.amount.toFixed(2)} (${item.percentage}%)</span>
        </div>
        <div class="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
          <div class="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style="width: ${item.percentage}%"></div>
        </div>
      `;
      categoryProgressList.appendChild(wrapper);
    });

    if (categoryProgressList.children.length === 0) {
      categoryProgressList.innerHTML = `<p class="text-xs text-slate-500">No category spending recorded for this date.</p>`;
    }
  }

  function renderChart(breakdown) {
    const activeCategories = breakdown.filter((item) => item.amount > 0);
    const labels = activeCategories.map((item) => item.category);
    const dataValues = activeCategories.map((item) => item.amount);

    const ctx = document.getElementById("categoryChart").getContext("2d");

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: [
              "#6366f1", "#10b981", "#f59e0b", "#ef4444", 
              "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"
            ],
            borderWidth: 2,
            borderColor: "#1e293b"
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#cbd5e1", font: { size: 11 } }
          }
        }
      }
    });
  }

  function showAlert(msg, type) {
    alertBox.textContent = msg;
    alertBox.classList.remove("hidden", "bg-rose-500/20", "text-rose-300", "bg-emerald-500/20", "text-emerald-300");
    if (type === "error") {
      alertBox.classList.add("bg-rose-500/20", "text-rose-300");
    } else {
      alertBox.classList.add("bg-emerald-500/20", "text-emerald-300");
    }
  }

  function hideAlert() {
    alertBox.classList.add("hidden");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  }
});
