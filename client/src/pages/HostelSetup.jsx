import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "react-hot-toast";
import api from "../api/axios";

export default function HostelSetup() {
	const navigate = useNavigate();
	
	const [step, setStep] = useState(1);

	const [formData, setFormData] = useState({
		name: "",
		address: "",
		totalRooms: "",
		phone: "",
		email: ""
	});

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};

	const handleNext = () => {
		setStep((prev) => prev+1);
	};

	const handleBack = () => {
		setStep((prev) => prev-1);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			await api.post("/api/hostels", formData);

			toast.success("Welcome to Hostel Management Dashboard");

			navigate("/dashboard");
		} catch (error) {
			toast.error (error.response?.data?.message || "Failed to create hostel");
		}
	};

	return (
		<div className="max-w-lg mx-auto p-6">
			<h1 className="text-3xl font-bold mb-6">Hostel Setup Wizard</h1>

			<form onSubmit={handleSubmit}>
				{step === 1 && (
					<div>
						<h2 className="text-xl font-semibold mb-4">Step 1</h2>
						<div className="mb-4">
							<label>Hostel Name</label>

							<input
								type="text"
								name="name"
								value={formData.name}
								onChange={handleChange}
								className="w-full border p-2 rounded"
								placeholder="Enter hostel name"
							/>
						</div>

						<div className="mb-4">
							<label>Address</label>

							<textarea 
								name="address"
								value={formData.address}
								onChange={handleChange}
								className="w-full border p-2 rounded"
								placeholder="Enter address"
							/>
						</div>

						<button
							type="button"
							onClick={handleNext}
							className="px-4 py-2 bg-blue-500 text-white rounded"
						>
							Next
						</button>
					</div>
				)}

				{step === 2 && (
					<div>
						<h2 className="text-xl font-semibold mb-4">Step 2</h2>

						<div className="mb-4">
							<label>Total Rooms</label>

							<input
								type="number"
								name="totalRooms"
								value={formData.totalRooms}
								onChange={handleChange}
								className="w-full border p-2 rounded"
								placeholder="Enter total rooms"
							/>
						</div>

						<div className="mb-4">
							<label>Phone</label>

							<input
								type="text"
								name="phone"
								value={formData.phone}
								onChange={handleChange}
								className="w-full border p-2 rounded"
								placeholder="Enter phone number"
							/>
						</div>

						<div className="mb-4">
							<label>Email</label>

							<input
								type="text"
								name="email"
								value={formData.email}
								onChange={handleChange}
								className="w-full border p-2 rounded"
								placeholder="Enter email"
							/>
						</div>

						<div className="flex gap-3">
							<button
								type="button"
								onClick={handleBack}
								className="px-4 py-2 bg-gray-500 text-white rounded"
							>
								Back
							</button>

							<button
								type="submit"
								className="px-4 py-2 bg-green-600 text-white rounded"
							>
								Create Hostel
							</button>
						</div>
					</div>
				)}
			</form>
		</div>
	);
}
