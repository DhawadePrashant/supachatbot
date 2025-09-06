import axios from "axios";

//this i test

  
const api = axios.create({
  baseURL: "https://api.0804.in/api",
  // baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

// ✅ Automatically attach token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchClientConfig = (chatbotId) => {
  return api.get(`/chatbot/${chatbotId}/config`);
};

export const updateClientConfig = (chatbotId, config) => {
  return api.put(`/chatbot/${chatbotId}/config`, config);
};

// Customization API endpoints
export const fetchCustomization = (chatbotId) => {
  return api.get(`/customizations/${chatbotId}`);
};

export const updateCustomization = (chatbotId, customization) => {
  return api.put(`/customizations/${chatbotId}`, customization);
};

export const resetCustomization = (chatbotId) => {
  return api.post(`/customizations/${chatbotId}/reset`);
};

export default api;
