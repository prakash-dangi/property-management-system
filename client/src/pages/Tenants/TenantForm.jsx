import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { createTenant } from "../../api/tenantApi";
import useRoomStore from "../../store/roomStore";

import PersonalInfoStep   from "./steps/PersonalInfoStep";
import RoomAssignmentStep from "./steps/RoomAssignmentStep";
import DocumentStep       from "./steps/DocumentStep";
import ConfirmStep        from "./steps/ConfirmStep";
import CredentialsModal   from "../../components/CredentialsModal";

const STEP_LABELS = ["Personal Info", "Room", "Documents", "Confirm"];

export default function TenantForm() {
    const navigate = useNavigate();
    const selectedHostel = useRoomStore(state => state.selectedHostel);

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [credentials, setCredentials] = useState(null); // { email, tempPassword }
    const [showCredentials, setShowCredentials] = useState(false);

    // One useForm instance for the entire multi-step form
    const methods = useForm({
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            dob: "",
            gender: "",
            roomId: "",
            roomLabel: "",
            idProofType: "",
            idProof: null,
            emergencyContactName: "",
            emergencyContactPhone: "",
            emergencyContactRelation: ""
        }
    });

    const next = () => setStep(s => s + 1);
    const prev = () => setStep(s => s - 1);

    const submit = async () => {
        if (!selectedHostel) {
            toast.error("No hostel selected. Please select a hostel first.");
            return;
        }

        const values = methods.getValues();
        setIsSubmitting(true);

        try {
            // Build FormData — required because idProof is a File object
            const formData = new FormData();

            // Append all simple fields
            formData.append("name",  values.name);
            formData.append("email", values.email);
            formData.append("phone", values.phone);
            formData.append("roomId", values.roomId);

            if (values.dob)         formData.append("dob", values.dob);
            if (values.gender)      formData.append("gender", values.gender);
            if (values.idProofType) formData.append("idProofType", values.idProofType);

            // Emergency contact — nest into the object the backend expects
            formData.append("emergencyContact[name]",     values.emergencyContactName);
            formData.append("emergencyContact[phone]",    values.emergencyContactPhone);
            formData.append("emergencyContact[relation]", values.emergencyContactRelation);

            // Append file only if selected
            if (values.idProof) {
                formData.append("file", values.idProof);
            }

            const result = await createTenant(selectedHostel._id, formData);

            // Show credentials modal with temp password
            if (result.credentials) {
                setCredentials(result.credentials);
                setShowCredentials(true);
            } else {
                toast.success("Tenant created successfully");
                navigate("/dashboard/tenants");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create tenant");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCredentialsClose = () => {
        setShowCredentials(false);
        navigate("/dashboard/tenants");
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Add New Tenant</h1>
                <p className="text-sm text-gray-500 mt-0.5">Fill in the details to onboard a new tenant</p>
            </div>

            {/* Step Progress Bar */}
            <div className="flex items-center gap-2">
                {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1;
                    const isActive    = step === stepNum;
                    const isCompleted = step > stepNum;
                    return (
                        <div key={label} className="flex items-center flex-1">
                            <div className={`
                                flex items-center gap-1.5 flex-1
                                ${i < STEP_LABELS.length - 1 ? "after:flex-1 after:h-px after:bg-gray-200 after:ml-2" : ""}
                            `}>
                                <div className={`
                                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                    ${isCompleted ? "bg-green-500 text-white"
                                    : isActive    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-500"}
                                `}>
                                    {isCompleted ? "✓" : stepNum}
                                </div>
                                <span className={`text-xs hidden sm:block ${isActive ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                                    {label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                {/* FormProvider makes the form instance available to all children via useFormContext() */}
                <FormProvider {...methods}>
                    <form onSubmit={e => e.preventDefault()}>
                        {step === 1 && <PersonalInfoStep   onNext={next} />}
                        {step === 2 && <RoomAssignmentStep onNext={next} onPrev={prev} />}
                        {step === 3 && <DocumentStep       onNext={next} onPrev={prev} />}
                        {step === 4 && <ConfirmStep        onPrev={prev} onSubmit={submit} isSubmitting={isSubmitting} />}
                    </form>
                </FormProvider>
            </div>

            {/* Credentials Modal — shown after successful creation */}
            <CredentialsModal
                open={showCredentials}
                credentials={credentials}
                onClose={handleCredentialsClose}
            />
        </div>
    );
}