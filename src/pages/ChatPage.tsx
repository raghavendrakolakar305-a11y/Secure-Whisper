import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Paperclip,
  Smile,
  Menu,
  Settings,
  Info,
  Shield,
  MoreVertical,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { API_URL, WS_URL } from "@/lib/api";

interface Contact {
  id: string;
  name: string;
  avatar?: string;
  status: "online" | "offline" | "away";
  lastMessage?: string;
  unread?: number;
  timestamp?: string;
}

interface Message {
  id: string;
  sender: "me" | "them";
  content: string;
  timestamp: string;
  encrypted: boolean;
  type: "text" | "file";
  fileName?: string;
  fileSize?: number;
}

interface CurrentUser {
  id: string;
  username?: string;
  displayName?: string;
}

interface FriendsResponse {
  friends: Array<{ id: string; username: string }>;
}

interface MessagesResponse {
  messages: Array<{
    id: string;
    sender_id: string;
    content: string;
    created_at: string | number;
    type?: "text" | "file";
    fileName?: string;
    fileSize?: number;
  }>;
}

const emojis = ["😀", "😂", "😍", "😊", "🥰", "👍", "❤️", "🎉", "🙏", "😎", "😭", "🔥"];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const ChatPage = () => {
  const [friends, setFriends] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Auth state
  const [token] = useState<string>(localStorage.getItem("token") || "");
  const [currentUser] = useState<CurrentUser | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") as CurrentUser | null;
    } catch {
      return null;
    }
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!token || !currentUser) {
      navigate("/");
    }
  }, [token, currentUser, navigate]);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const [addingUsername, setAddingUsername] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<{ id: string; username: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  // Update ref whenever currentChatId changes
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  const getStatusColor = (status: Contact["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  function makeChatId(a: string | number, b: string | number) {
    const aStr = String(a);
    const bStr = String(b);
    // Sort alphabetically to ensure consistent chatId regardless of order
    const [min, max] = aStr < bStr ? [aStr, bStr] : [bStr, aStr];
    return `chat_${min}_${max}`;
  }

  async function fetchFriends() {
    if (!token) return;
    try {
      const resp = await fetch(`${API_URL}/api/friends`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) {
        const data: { error?: string } = await resp.json();
        toast({ title: "Could not load friends", description: data.error || "Please try again.", variant: "destructive" });
        return;
      }

      const data: FriendsResponse = await resp.json();
      const mapped = data.friends.map((friend) => ({ id: String(friend.id), name: friend.username, status: "offline" as const }));
      setFriends(mapped);
      setSelectedContact(mapped[0] ?? null);
    } catch (error) {
      console.error("Fetch friends error:", error);
      toast({ title: "Could not load friends", description: "Check your connection and try again.", variant: "destructive" });
    }
  }

  async function fetchMessagesFor(chatId: string) {
    if (!token) return;
    try {
      const resp = await fetch(`${API_URL}/api/messages?chatId=${encodeURIComponent(chatId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data: MessagesResponse = await resp.json();
      if (resp.ok) {
        const mapped = data.messages.map((message) => ({
          id: String(message.id),
          sender: String(message.sender_id) === String(currentUser?.id ?? -1) ? "me" : "them",
          content: message.content,
          timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          encrypted: true,
          type: message.type ?? "text",
          fileName: message.fileName,
          fileSize: message.fileSize,
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  }

  // create WS connection only once when token is available
  useEffect(() => {
    if (!token) return;

    // Only create if not already exists
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Subscribe to current chat if one is selected (use ref for latest value)
      if (currentChatIdRef.current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "subscribe", chatId: currentChatIdRef.current }));
      }
    };

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type === "message" && payload.message) {
          const msg = payload.message;
          // Check if this message is for the currently active chat (use ref for latest value)
          if (msg.chat_id === currentChatIdRef.current) {
            console.log('Received message for current chat:', msg.chat_id, 'Message ID:', msg.id);
            setMessages((m) => {
              // Check if message already exists to prevent duplicates
              if (m.some(existingMsg => existingMsg.id === String(msg.id))) {
                console.log('Duplicate message detected, skipping:', msg.id);
                return m;
              }
              console.log('Adding new message:', msg.id);
              return [
                ...m,
                {
                  id: String(msg.id),
                  sender: String(msg.sender_id) === String(currentUser?.id ?? -1) ? "me" : "them",
                  content: msg.content,
                  timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  encrypted: true,
                  type: msg.type ?? "text",
                  fileName: msg.fileName,
                  fileSize: msg.fileSize,
                },
              ];
            });
          } else {
            console.log('Message for different chat:', msg.chat_id, 'Current chat:', currentChatIdRef.current);
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      // Only close if component unmounts or token changes
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (error) {
          console.error("WebSocket close error:", error);
        }
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // load friends for active account when page loads or account changes
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser]);

  // subscribe to chat when selectedContact changes
  useEffect(() => {
    if (!selectedContact || !currentUser) return;
    
    const chatId = makeChatId(currentUser.id, selectedContact.id);
    console.log('Creating chat with IDs:', currentUser.id, selectedContact.id, 'ChatID:', chatId);
    
    // Store previous chat ID
    const previousChatId = currentChatIdRef.current;
    
    // Clear previous messages immediately to avoid showing wrong chat
    setMessages([]);
    setCurrentChatId(chatId);
    
    // Fetch messages for the new chat
    fetchMessagesFor(chatId);

    // Subscribe/unsubscribe via ws - wait for connection to be ready
    const subscribeToChat = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Unsubscribe from previous chat if exists
        if (previousChatId && previousChatId !== chatId) {
          wsRef.current.send(JSON.stringify({ type: "unsubscribe", chatId: previousChatId }));
          console.log('Unsubscribed from previous chat:', previousChatId);
        }
        // Subscribe to new chat
        wsRef.current.send(JSON.stringify({ type: "subscribe", chatId }));
        console.log('Subscribed to new chat:', chatId);
      } else {
        // try again after a short delay
        setTimeout(subscribeToChat, 100);
      }
    };

    subscribeToChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact, currentUser]);


  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function chooseFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File is too large", description: "Choose a file that is 20 MB or smaller.", variant: "destructive" });
      return;
    }
    setPendingFile(file);
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Could not read the selected file"));
      };
      reader.onerror = () => reject(reader.error || new Error("Could not read the selected file"));
      reader.readAsDataURL(file);
    });
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || (!message.trim() && !pendingFile)) return;
    if (!currentChatId) {
      toast({ title: "Error", description: "No chat selected", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      if (message.trim()) {
        const resp = await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId: currentChatId, content: message.trim(), type: "text" }),
        });
        const data: { error?: string } = await resp.json();
        if (!resp.ok) {
          toast({ title: "Error", description: data.error || "Failed to send", variant: "destructive" });
          return;
        }
        setMessage("");
      }

      if (pendingFile) {
        const content = await readFileAsDataUrl(pendingFile);
        const resp = await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chatId: currentChatId,
            content,
            type: "file",
            fileName: pendingFile.name,
          }),
        });
        const data: { error?: string } = await resp.json();
        if (!resp.ok) {
          toast({ title: "File not sent", description: data.error || "Failed to send file", variant: "destructive" });
          return;
        }
        setPendingFile(null);
      }
    } catch (error) {
      console.error("Send message error:", error);
      toast({ title: "Error", description: "Could not send. Check your connection and try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }

  };

  async function handleSearchUser() {
    if (!addingUsername.trim()) return;
    if (!token) {
      navigate("/");
      return;
    }

    setIsSearching(true);
    try {
      const searchResp = await fetch(
        `${API_URL}/api/users/search?q=${encodeURIComponent(addingUsername.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (searchResp.status === 401) {
        toast({ 
          title: "Session expired", 
          description: "Please login again", 
          variant: "destructive" 
        });
        navigate("/");
        return;
      }

      const searchData = await searchResp.json();
      
      if (!searchResp.ok || !searchData.user) {
        toast({ 
          title: "User not found", 
          description: searchData.error || "Please check the username and try again", 
          variant: "destructive" 
        });
        setSearchResult(null);
        return;
      }

      setSearchResult(searchData.user);
      toast({ 
        title: "User found", 
        description: "Click 'Add Friend' to send friend request" 
      });
    } catch (err) {
      toast({ 
        title: "Error", 
        description: "Could not connect to server. Please try again.", 
        variant: "destructive" 
      });
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddFriend() {
    if (!searchResult) return;
    
    try {
      const resp = await fetch(`${API_URL}/api/friends/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ identifier: searchResult.username }),
      });
      const data = await resp.json();
      
      if (!resp.ok) {
        toast({ title: "Error", description: data.error || "Could not add friend", variant: "destructive" });
        return;
      }
      
      const newFriend: Contact = {
        id: String(data.friend.id),
        name: data.friend.username,
        status: "offline"
      };
      
      setFriends((f) => [newFriend, ...f]);
      setAddingUsername("");
      setSearchResult(null);
      toast({ title: "Friend added", description: `${newFriend.name} added` });
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  }

  async function handleClearChat() {
    if (!currentChatId) return;
    
    try {
      const resp = await fetch(`${API_URL}/api/messages/clear`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chatId: currentChatId }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        toast({ title: "Error", description: data.error || "Failed to clear chat", variant: "destructive" });
        return;
      }

      setMessages([]);
      setShowClearDialog(false);
      toast({ title: "Chat cleared", description: "All messages have been removed" });
    } catch (err) {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  }




  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } bg-card border-r border-border transition-all duration-300 flex flex-col overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Messages</h2>
              <p className="text-xs text-muted-foreground">
                {currentUser?.displayName || currentUser?.username}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                className="hover:bg-muted"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/about")}
                className="hover:bg-muted"
              >
                <Info className="w-5 h-5" />
              </Button>

            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-10 bg-input border-border"
            />
          </div>

          {/* Add friend by username/email */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input 
                placeholder="Search friend by username" 
                value={addingUsername} 
                onChange={(e) => {
                  setAddingUsername(e.target.value);
                  setSearchResult(null); // Clear previous search
                }} 
                className="flex-1 bg-input border-border" 
              />
              <Button 
                onClick={handleSearchUser} 
                className="bg-secondary text-secondary-foreground"
                disabled={!addingUsername.trim() || isSearching}
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
            {searchResult && (
              <div className="flex items-center justify-between p-2 bg-card rounded-md border border-border">
                <div>
                  <p className="font-medium">{searchResult.username}</p>
                </div>
                <Button 
                  onClick={handleAddFriend} 
                  className="bg-primary text-primary-foreground"
                  size="sm"
                >
                  Add Friend
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No friends yet. Search for a username above to add someone.
            </p>
          )}
          {friends.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border ${
                selectedContact?.id === contact.id ? "bg-muted" : ""
              }`}
            >
              <div className="relative">
                <Avatar>
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    {contact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(
                    contact.status
                  )}`}
                />
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold truncate">{contact.name}</span>
                  <span className="text-xs text-muted-foreground">{contact.timestamp ?? ""}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{contact.lastMessage ?? ""}</p>
              </div>

              {contact.unread && contact.unread > 0 && (
                <Badge className="bg-primary text-primary-foreground">{contact.unread}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="relative">
              <Avatar>
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {selectedContact?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(
                  selectedContact?.status ?? "offline"
                )}`}
              />
            </div>

            <div>
              <h3 className="font-semibold">{selectedContact?.name ?? "Select a chat"}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground capitalize">
                  {selectedContact?.status ?? ""}
                </span>
                {isTyping && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <span className="w-1 h-1 bg-primary rounded-full animate-typing"></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-typing" style={{ animationDelay: "0.2s" }}></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-typing" style={{ animationDelay: "0.4s" }}></span>
                    typing
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Encrypted
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-muted">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Clear Chat Confirmation Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Chat</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all messages in this chat? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearChat} className="bg-destructive text-destructive-foreground">
                Clear Chat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
          {!selectedContact && (
            <p className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Add a friend to start a conversation.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div
                className={`max-w-[70%] ${
                  msg.sender === "me"
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                    : "bg-card border border-border"
                } rounded-2xl p-4 shadow-sm`}
              >
                {msg.type === "file" ? (
                  <a
                    href={msg.content}
                    download={msg.fileName || "attachment"}
                    className="flex items-center gap-2 text-sm underline underline-offset-2"
                  >
                    <Paperclip className="h-4 w-4 shrink-0" />
                    <span className="break-all">{msg.fileName || "Download attachment"}</span>
                    {typeof msg.fileSize === "number" && (
                      <span className="shrink-0 text-xs opacity-70">{formatFileSize(msg.fileSize)}</span>
                    )}
                  </a>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs opacity-70">{msg.timestamp}</span>
                  {msg.encrypted && (
                    <Shield className="w-3 h-3 opacity-70" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-card">
          {pendingFile && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {pendingFile.name} <span className="text-muted-foreground">({formatFileSize(pendingFile.size)})</span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPendingFile(null)}>
                Remove
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              chooseFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hover:bg-muted"
              aria-label="Attach a file"
              disabled={!selectedContact || isSending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hover:bg-muted"
                aria-label="Choose an emoji"
                aria-expanded={showEmojiPicker}
                disabled={!selectedContact || isSending}
                onClick={() => setShowEmojiPicker((open) => !open)}
              >
                <Smile className="w-5 h-5" />
              </Button>
              {showEmojiPicker && (
                <div
                  role="group"
                  aria-label="Emoji picker"
                  className="absolute bottom-12 left-0 z-20 grid w-64 grid-cols-6 gap-1 rounded-lg border border-border bg-card p-2 shadow-lg"
                >
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`Insert ${emoji}`}
                      className="flex h-9 w-9 items-center justify-center rounded text-xl hover:bg-muted"
                      onClick={() => {
                        setMessage((current) => current + emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 bg-input border-border"
              disabled={!selectedContact || isSending}
            />

            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
              disabled={!selectedContact || isSending || (!message.trim() && !pendingFile)}
              aria-label="Send message"
            >
              {isSending ? <span className="text-xs">Sending</span> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;