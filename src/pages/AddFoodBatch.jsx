import { useState } from "react";
import "./AddFoodBatch.css";

function AddFoodBatch({ onBack }) {
  const [formData, setFormData] = useState({
    foodName: "",
    category: "",
    quantity: "",
    unit: "MEALS",
    preparedTime: "",
    expiryTime: "",
    storageCondition: "ROOM_TEMP",
  });

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
  event.preventDefault();
  setError("");

  if (
    !formData.foodName ||
    !formData.category ||
    !formData.quantity ||
    !formData.preparedTime ||
    !formData.expiryTime
  ) {
    setError("Please fill in all required fields.");
    return;
  }

  if (Number(formData.quantity) <= 0) {
    setError("Quantity must be greater than 0.");
    return;
  }

  const preparedTime = new Date(formData.preparedTime);
  const expiryTime = new Date(formData.expiryTime);

  if (expiryTime <= preparedTime) {
    setError("Expiry time must be after the prepared time.");
    return;
  }

  const foodItemMap = {
    "Vegetable Rice": 1,
    "Paneer Curry": 2,
    "Chapati": 3,
    "Bread Loaf": 4,
    "Bananas": 5,
    "Mixed Vegetables": 6,
    "Cake": 7,
    "Packaged Biscuits": 8,
    "Fruit Juice": 9,
  };

  const itemId = foodItemMap[formData.foodName];

  if (!itemId) {
    setError(
      "Food item not found. Please use an existing food item name."
    );
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/food-batches",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchId: 1007,
          donorId: 1,
          itemId,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          preparedTime: formData.preparedTime.replace("T", " ") + ":00",
          expiryTime: formData.expiryTime.replace("T", " ") + ":00",
          storageCondition: formData.storageCondition,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message);
    }

    alert("Food batch added successfully.");

    setFormData({
      foodName: "",
      category: "",
      quantity: "",
      unit: "MEALS",
      preparedTime: "",
      expiryTime: "",
      storageCondition: "ROOM_TEMP",
    });
  } catch (error) {
    console.error("Add food batch error:", error);
    setError(error.message || "Failed to add food batch.");
  }
};

  return (
    <div className="add-batch-page">
      <div className="add-batch-header">
        <div>
          <p className="page-label">DONOR PORTAL</p>
          <h1>Add Surplus Food</h1>
          <p>
            Register a new food batch available for redistribution.
          </p>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="add-batch-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="section-heading">
              <span>01</span>
              <div>
                <h2>Food Information</h2>
                <p>Tell us about the surplus food.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="foodName">
                  Food name <span>*</span>
                </label>

                <input
                  id="foodName"
                  name="foodName"
                  type="text"
                  placeholder="e.g. Vegetable Rice"
                  value={formData.foodName}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label htmlFor="category">
                  Category <span>*</span>
                </label>

                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="">Select category</option>
                  <option value="RICE_MEALS">Rice & Meals</option>
                  <option value="BREAD">Bread</option>
                  <option value="FRUITS">Fruits</option>
                  <option value="VEGETABLES">Vegetables</option>
                  <option value="BAKERY">Bakery</option>
                  <option value="PACKAGED_FOOD">
                    Packaged Food
                  </option>
                  <option value="BEVERAGES">Beverages</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="quantity">
                  Quantity <span>*</span>
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label htmlFor="unit">Unit</label>

                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                >
                  <option value="MEALS">Meals</option>
                  <option value="KG">Kilograms</option>
                  <option value="LITRES">Litres</option>
                  <option value="PACKETS">Packets</option>
                  <option value="UNITS">Units</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-heading">
              <span>02</span>
              <div>
                <h2>Availability & Safety</h2>
                <p>Help us determine how long the food can be redistributed.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="preparedTime">
                  Prepared time <span>*</span>
                </label>

                <input
                  id="preparedTime"
                  name="preparedTime"
                  type="datetime-local"
                  value={formData.preparedTime}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label htmlFor="expiryTime">
                  Expiry time <span>*</span>
                </label>

                <input
                  id="expiryTime"
                  name="expiryTime"
                  type="datetime-local"
                  value={formData.expiryTime}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label htmlFor="storageCondition">
                  Storage condition
                </label>

                <select
                  id="storageCondition"
                  name="storageCondition"
                  value={formData.storageCondition}
                  onChange={handleChange}
                >
                  <option value="ROOM_TEMP">Room Temperature</option>
                  <option value="REFRIGERATED">Refrigerated</option>
                  <option value="FROZEN">Frozen</option>
                  <option value="DRY_STORAGE">Dry Storage</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onBack}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-button"
            >
              Add Food Batch
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddFoodBatch;