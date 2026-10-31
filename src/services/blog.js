import axios from "axios";
import { editorToken } from "./devotionals";
export const BLOG_API = (
  import.meta.env.PROD
    ? "https://christ-reformation-house-website-new-1.onrender.com/api"
    : import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");
const client = axios.create({ baseURL: BLOG_API, timeout: 25000 });
const staff = () => ({
  headers: { Authorization: `Bearer ${editorToken() || ""}` },
});
export const blogError = (e) =>
  e.response?.data?.error ||
  "The blog is temporarily unavailable. Please try again.";
export const blogList = (params) =>
  client.get("/blog", { params }).then((r) => r.data);
export const blogPost = (slug) =>
  client.get(`/blog/${encodeURIComponent(slug)}`).then((r) => r.data.post);
export const blogCommunity = (id, page = 0) =>
  client.get(`/blog/${id}/community`, { params: { page } }).then((r) => r.data);
export const blogInteract = (id, action, body) =>
  client.post(`/blog/${id}/${action}`, body).then((r) => r.data);
export const blogDesk = (page = 0) =>
  client
    .get("/ministry-admin/blog", { ...staff(), params: { page } })
    .then((r) => r.data);
export const blogSave = (body) =>
  client.post("/ministry-admin/blog", body, staff()).then((r) => r.data.post);
export const blogUpload = (file, id) =>
  client
    .post(`/ministry-admin/blog/images?id=${id}`, file, {
      ...staff(),
      headers: { ...staff().headers, "Content-Type": file.type },
      timeout: 45000,
    })
    .then((r) => r.data);
export const blogPrivateImage = (id) =>
  client
    .get(`/ministry-admin/blog/images/${id}`, {
      ...staff(),
      responseType: "blob",
    })
    .then((r) => r.data);
export const blogModeration = (status, page = 0) =>
  client
    .get("/ministry-admin/blog/comments", {
      ...staff(),
      params: { status, page },
    })
    .then((r) => r.data.comments);
export const blogModerate = (id, status, expected) =>
  client.post(
    `/ministry-admin/blog/comments/${id}`,
    { status, expected },
    staff(),
  );
export const blogAI = (body) =>
  client
    .post("/ministry-admin/blog/ai", body, { ...staff(), timeout: 55000 })
    .then((r) => r.data.suggestion);
export const blogImage = (id) => `${BLOG_API}/blog/images/${id}`;
export const blogDate = (value) =>
  new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "long",
  }).format(new Date(value));
export const blogUrl = (slug) =>
  `https://www.christreformationhouse.org.ng/blog/${slug}`;
