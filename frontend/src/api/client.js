import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;

export function getApiErrorMessage(error) {
  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return "Unable to connect to the server. Please try again.";
  }

  const apiError = error?.response?.data?.error;
  if (!apiError) {
    return error?.message || "Something went wrong";
  }

  if (Array.isArray(apiError.details) && apiError.details.length > 0) {
    return apiError.details
      .map((detail) => {
        const field = detail.field ? `${detail.field}: ` : "";
        return `${field}${detail.message}`;
      })
      .join("; ");
  }

  return apiError.message || apiError.code || "Request failed";
}
