"use client"

import { useParams } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  return <ChatView projectId={projectId} />;
}
