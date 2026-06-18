export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type User = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};
