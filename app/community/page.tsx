'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Radio,
  MessageSquare,
  AlertTriangle,
  UserPlus,
  Send,
  Plus,
  X,
  Lock,
  ArrowRight,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  RefreshCw,
  Heart,
  ChevronRight,
  BadgeCheck,
  MapPin,
  ExternalLink,
} from 'lucide-react';

type TabType = 'rooms' | 'hazards' | 'friends';

interface SupportRoom {
  id: string;
  title: string;
  topic: string;
  description: string;
  isVolunteerLed: boolean;
  isActive: boolean;
  createdAt: string;
  messageCount: number;
  creator: {
    id: string;
    fullName: string;
    maskedId: string;
    isVerified: boolean;
    isVolunteer: boolean;
  };
}

interface RoomMessage {
  id: string | number;
  roomId: string;
  senderId: string;
  message: string;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    maskedId: string;
    isVerified: boolean;
    isVolunteer: boolean;
  };
}

interface Hazard {
  id: string;
  title: string;
  description?: string;
  category?: string;
  lat: number;
  lng: number;
  risk_level?: string;
  riskLevel?: string;
  verification_count?: number;
  verificationCount?: number;
  created_at?: string;
  createdAt?: string;
}

interface HazardComment {
  id: string | number;
  hazardId: string;
  userId: string;
  message: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    maskedId: string;
    isVerified: boolean;
    isVolunteer: boolean;
  };
}

interface Friend {
  id: string;
  fullName: string;
  maskedId: string;
  isVolunteer: boolean;
  isVerified: boolean;
  friendshipDate?: string;
}

interface DirectMessage {
  id: string | number;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
  senderName?: string;
  senderMaskedId?: string;
}

const ROOM_TOPIC_PILLS = [
  'Night Transit',
  'Campus Safe Walk',
  'Metro Commute',
  'Late Shift Safe Cohort',
  'Emergency Transit Support',
];

function formatTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Recently';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export default function CommunityPage() {
  const router = useRouter();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  // 3-Way Tab Switcher State
  const [activeTab, setActiveTab] = useState<TabType>('rooms');

  // Tab 1: Virtual Support Rooms States
  const [rooms, setRooms] = useState<SupportRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('Night Transit');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [hostRoomError, setHostRoomError] = useState<string | null>(null);

  // Active Support Room Chat Drawer
  const [activeRoom, setActiveRoom] = useState<SupportRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [roomInputMessage, setRoomInputMessage] = useState('');
  const [isSendingRoomMsg, setIsSendingRoomMsg] = useState(false);
  const roomMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Tab 2: Nearby Hazard Threads States
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [isLoadingHazards, setIsLoadingHazards] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [hazardComments, setHazardComments] = useState<HazardComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [hazardCommentInput, setHazardCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Tab 3: Guardian Circle & Friends Chat States
  const [friends, setFriends] = useState<Friend[]>([]);
  const [discoverableUsers, setDiscoverableUsers] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [dmInputMessage, setDmInputMessage] = useState('');
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const dmEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Session Check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (!isSubscribed) return;

      try {
        const stored = localStorage.getItem('abhaya_user');
        if (!stored) {
          router.replace('/login');
          return;
        }
        const parsed = JSON.parse(stored);
        if (!parsed || parsed.is_verified !== true) {
          router.replace('/login');
          return;
        }
        setCurrentUser(parsed);
        setIsVerified(parsed.is_verified === true);
      } catch {
        router.replace('/login');
      }
    }, 0);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isMounted, router]);

  // 2. Fetch Support Rooms
  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/community/rooms');
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error('Failed to fetch support rooms:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  // 3. Fetch Hazards for Threads
  const fetchHazards = useCallback(async () => {
    setIsLoadingHazards(true);
    try {
      const res = await fetch('/api/hazards');
      const data = await res.json();
      if (data.success && Array.isArray(data.hazards)) {
        setHazards(data.hazards);
        if (data.hazards.length > 0 && !selectedHazard) {
          setSelectedHazard(data.hazards[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch hazards:', err);
    } finally {
      setIsLoadingHazards(false);
    }
  }, [selectedHazard]);

  // 4. Fetch Friends and Discoverable Residents
  const fetchFriends = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingFriends(true);
    try {
      const res = await fetch(`/api/community/friends?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends || []);
        setDiscoverableUsers(data.discoverableUsers || []);
        if (data.friends?.length > 0 && !selectedFriend) {
          setSelectedFriend(data.friends[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [currentUser, selectedFriend]);

  // Load active tab data
  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'rooms') fetchRooms();
    if (activeTab === 'hazards') fetchHazards();
    if (activeTab === 'friends') fetchFriends();
  }, [activeTab, currentUser, fetchRooms, fetchHazards, fetchFriends]);

  // Fetch comments for selected hazard
  const fetchHazardComments = useCallback(async (hazardId: string) => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/community/hazards/comments?hazardId=${hazardId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.comments)) {
        setHazardComments(data.comments);
      }
    } catch (err) {
      console.error('Failed to fetch hazard comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedHazard) {
      fetchHazardComments(selectedHazard.id);
    }
  }, [selectedHazard, fetchHazardComments]);

  // Fetch messages for active room
  const fetchRoomMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/community/rooms/${roomId}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setRoomMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch room messages:', err);
    }
  }, []);

  useEffect(() => {
    if (activeRoom) {
      fetchRoomMessages(activeRoom.id);
      const interval = setInterval(() => fetchRoomMessages(activeRoom.id), 3500);
      return () => clearInterval(interval);
    }
  }, [activeRoom, fetchRoomMessages]);

  useEffect(() => {
    roomMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  // Fetch Direct Messages for selected friend
  const fetchDirectMessages = useCallback(async (friendId: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/community/messages/direct?userId=${currentUser.id}&friendId=${friendId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setDirectMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch direct messages:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedFriend) {
      fetchDirectMessages(selectedFriend.id);
      const interval = setInterval(() => fetchDirectMessages(selectedFriend.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedFriend, fetchDirectMessages]);

  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [directMessages]);

  // Handle Host New Room
  const handleHostRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified || !currentUser?.id) {
      setHostRoomError('Citizen verification required to launch a room.');
      return;
    }
    if (!newRoomTitle.trim()) {
      setHostRoomError('Please provide a room title.');
      return;
    }

    setIsCreatingRoom(true);
    setHostRoomError(null);

    try {
      const res = await fetch('/api/community/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: currentUser.id,
          title: newRoomTitle.trim(),
          topic: newRoomTopic,
          description: newRoomDesc.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to launch room.');
      }

      setIsHostModalOpen(false);
      setNewRoomTitle('');
      setNewRoomDesc('');
      fetchRooms();
      setActiveRoom(data.room);
    } catch (err: any) {
      setHostRoomError(err.message || 'Error launching support room.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Handle Send Room Message
  const handleSendRoomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !roomInputMessage.trim() || !currentUser?.id) return;

    const messageText = roomInputMessage.trim();
    setRoomInputMessage('');
    setIsSendingRoomMsg(true);

    try {
      const res = await fetch(`/api/community/rooms/${activeRoom.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          message: messageText,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setRoomMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Failed to post room message:', err);
    } finally {
      setIsSendingRoomMsg(false);
    }
  };

  // Handle Post Hazard Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHazard || !hazardCommentInput.trim() || !currentUser?.id) return;

    if (!isVerified) {
      setCommentError('Citizen verification required to post on hazard threads.');
      return;
    }

    const commentText = hazardCommentInput.trim();
    setHazardCommentInput('');
    setIsPostingComment(true);
    setCommentError(null);

    try {
      const res = await fetch('/api/community/hazards/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazardId: selectedHazard.id,
          userId: currentUser.id,
          message: commentText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit update.');
      }

      setHazardComments((prev) => [...prev, data.comment]);
    } catch (err: any) {
      setCommentError(err.message || 'Error posting comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Handle Send Direct Message
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !dmInputMessage.trim() || !currentUser?.id) return;

    const text = dmInputMessage.trim();
    setDmInputMessage('');
    setIsSendingDm(true);

    try {
      const res = await fetch('/api/community/messages/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: selectedFriend.id,
          message: text,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setDirectMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSendingDm(false);
    }
  };

  // Handle Add Friend from discoverable list
  const handleAddFriend = async (friendId: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch('/api/community/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          friendId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchFriends();
      }
    } catch (err) {
      console.error('Failed to add friend:', err);
    }
  };

  // Filtered friends list
  const filteredFriends = friends.filter((f) =>
    f.fullName.toLowerCase().includes(friendSearchQuery.toLowerCase())
  );

  // Loading Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0104] text-rose-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-rose-600/40 animate-pulse">
            A
          </div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 animate-spin text-rose-500" />
            Loading Verified Community Circles...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0104] text-zinc-100 flex flex-col md:flex-row font-sans antialiased relative selection:bg-rose-900 selection:text-white">
      <Navbar />

      <main className="flex-1 md:ml-72 p-3 md:p-6 pb-28 md:pb-8 max-w-7xl mx-auto space-y-6">
        {/* 1. Header & Navigation */}
        <header className="bg-[#18040d] border border-rose-950/60 p-5 rounded-3xl backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-br from-rose-600 to-pink-600 rounded-2xl text-white shadow-lg shadow-rose-950/60">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                    Abhaya Community Circles
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-900/60 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Verified Network
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Peer support, nearby hazard discussions, and verified responder networks.
                </p>
              </div>
            </div>

            {/* Verified Badge info */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0e0208] border border-rose-950/80 text-xs text-zinc-400">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              <span>Signed in as: <strong className="text-white">{currentUser.fullName}</strong></span>
            </div>
          </div>

          {/* 3-Way Tab Switcher */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-950/50">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`py-3 px-3 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 border ${
                activeTab === 'rooms'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-500 shadow-lg shadow-rose-950/50'
                  : 'bg-[#0d0207] text-zinc-400 border-rose-950/70 hover:text-white hover:border-rose-900/60'
              }`}
            >
              <Radio className="w-4 h-4 shrink-0" />
              <span className="truncate">Virtual Support Rooms</span>
            </button>

            <button
              onClick={() => setActiveTab('hazards')}
              className={`py-3 px-3 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 border ${
                activeTab === 'hazards'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-500 shadow-lg shadow-rose-950/50'
                  : 'bg-[#0d0207] text-zinc-400 border-rose-950/70 hover:text-white hover:border-rose-900/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="truncate">Nearby Hazard Threads</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`py-3 px-3 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 border ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-500 shadow-lg shadow-rose-950/50'
                  : 'bg-[#0d0207] text-zinc-400 border-rose-950/70 hover:text-white hover:border-rose-900/60'
              }`}
            >
              <Heart className="w-4 h-4 shrink-0" />
              <span className="truncate">Guardian Circle &amp; Friends</span>
            </button>
          </div>
        </header>

        {/* 2. TAB 1: Virtual Support Rooms */}
        {activeTab === 'rooms' && (
          <div className="space-y-5">
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18040d] border border-rose-950/60 p-4 rounded-3xl shadow-lg">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Live peer-to-peer safe spaces hosted by verified community members</span>
              </div>

              <button
                onClick={() => {
                  setHostRoomError(null);
                  setIsHostModalOpen(true);
                }}
                className="py-2.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-950/50 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Volunteer: Host a Room</span>
              </button>
            </div>

            {/* Support Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingRooms ? (
                <div className="col-span-full py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
                  <span>Loading safe spaces...</span>
                </div>
              ) : rooms.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-500 text-xs bg-[#18040d] border border-dashed border-rose-950/80 rounded-3xl p-8 space-y-3">
                  <Radio className="w-10 h-10 text-rose-500/40 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-200">No active support rooms open right now</h3>
                  <p className="text-zinc-400 max-w-sm mx-auto">
                    Be the first verified volunteer to open a peer safe space for late night travelers or campus walk cohorts.
                  </p>
                  <button
                    onClick={() => setIsHostModalOpen(true)}
                    className="py-2 px-4 bg-rose-900/60 text-rose-200 hover:bg-rose-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Open Safe Space
                  </button>
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-[#18040d] border border-rose-950/60 p-5 rounded-3xl shadow-xl hover:border-rose-900/80 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Live pulse tag & topic */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Active Safe Space
                        </span>
                        <span className="text-[11px] font-mono text-rose-300 bg-rose-950/60 border border-rose-900/50 px-2 py-0.5 rounded-full">
                          {room.topic}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {room.title}
                        </h3>
                        {room.description && (
                          <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {room.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-rose-950/50">
                      {/* Host details */}
                      <div className="flex items-center text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="truncate">
                            Hosted by <strong className="text-zinc-200">{room.creator?.fullName || 'Volunteer'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Enter Room Button */}
                      <button
                        onClick={() => setActiveRoom(room)}
                        className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-950/40 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Enter Room Chat</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. TAB 2: Nearby Hazard Threads */}
        {activeTab === 'hazards' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Hazard List (5 cols) */}
            <div className="lg:col-span-5 bg-[#18040d] border border-rose-950/60 p-4 rounded-3xl shadow-xl space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Nearby Hazard Reports
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">
                  {hazards.length} Active
                </span>
              </div>

              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
                {isLoadingHazards ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-500 mx-auto mb-1" />
                    <span>Loading hazard pins...</span>
                  </div>
                ) : hazards.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    No active hazard reports found in this zone.
                  </div>
                ) : (
                  hazards.map((hazard) => {
                    const isSelected = selectedHazard?.id === hazard.id;
                    const risk = (hazard.riskLevel || hazard.risk_level || 'MEDIUM').toUpperCase();
                    return (
                      <div
                        key={hazard.id}
                        onClick={() => setSelectedHazard(hazard)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-[#260616] border-rose-500 shadow-md shadow-rose-950/60 ring-1 ring-rose-500/80'
                            : 'bg-[#0d0207] border-rose-950/70 hover:border-rose-900/60 hover:bg-[#15040d]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              risk === 'HIGH'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : risk === 'LOW'
                                ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {risk} Hazard
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {formatRelativeTime(hazard.createdAt || hazard.created_at)}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white leading-tight">
                          {hazard.title}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-rose-950/50">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            {hazard.lat.toFixed(3)}, {hazard.lng.toFixed(3)}
                          </span>
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            Discuss Thread ➔
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Hazard Comments Thread (7 cols) */}
            <div className="lg:col-span-7 bg-[#18040d] border border-rose-950/60 p-5 rounded-3xl shadow-xl flex flex-col h-[610px] justify-between space-y-4">
              {selectedHazard ? (
                <>
                  {/* Thread Header */}
                  <div className="pb-3 border-b border-rose-950/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/60 border border-rose-900/50 px-2.5 py-0.5 rounded-full">
                        Live Commuter Discussion
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        {hazardComments.length} Community Updates
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white">
                      {selectedHazard.title}
                    </h3>
                    {selectedHazard.description && (
                      <p className="text-xs text-zinc-400">
                        {selectedHazard.description}
                      </p>
                    )}
                  </div>

                  {/* Comment Messages List */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {isLoadingComments ? (
                      <div className="py-16 text-center text-zinc-500 text-xs">
                        <RefreshCw className="w-4 h-4 animate-spin text-rose-500 mx-auto mb-1" />
                        <span>Loading comments...</span>
                      </div>
                    ) : hazardComments.length === 0 ? (
                      <div className="py-16 text-center text-zinc-500 text-xs border border-dashed border-rose-950/60 rounded-2xl p-6">
                        <MessageSquare className="w-6 h-6 text-rose-500/40 mx-auto mb-1" />
                        <span>No updates posted yet. Be the first to verify this location!</span>
                      </div>
                    ) : (
                      hazardComments.map((comment) => {
                        const isMe = comment.userId === currentUser.id;
                        return (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-2xl border space-y-1.5 ${
                              isMe
                                ? 'bg-gradient-to-r from-rose-950/70 to-[#2c081a] border-rose-800/80 ml-4'
                                : 'bg-[#0e0208] border-rose-950/70 mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <strong className="text-white font-semibold">
                                  {comment.user?.fullName || 'Verified Resident'}
                                </strong>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {formatTime(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-200 leading-relaxed">
                              {comment.message}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Post Comment Input */}
                  <form onSubmit={handlePostComment} className="pt-2 border-t border-rose-950/50 space-y-2">
                    {commentError && (
                      <div className="text-[11px] text-rose-300 bg-rose-950/60 border border-rose-800 px-3 py-1.5 rounded-xl">
                        {commentError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hazardCommentInput}
                        onChange={(e) => setHazardCommentInput(e.target.value)}
                        placeholder="Share update (e.g. Police patrol here, light repaired)..."
                        disabled={isPostingComment}
                        className="flex-1 bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isPostingComment || !hazardCommentInput.trim()}
                        className="py-3 px-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-950/50 disabled:opacity-40 transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Post</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="m-auto text-center text-zinc-500 text-xs">
                  Select a hazard on the left to view the commuter thread.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. TAB 3: Guardian Circle & Friends Chat */}
        {activeTab === 'friends' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Friends List & Search (5 cols) */}
            <div className="lg:col-span-5 bg-[#18040d] border border-rose-950/60 p-4 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  Your Guardian Circle
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  {friends.length} Friends
                </span>
              </div>

              {/* Search Friends Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  placeholder="Search friends by name..."
                  className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Friends List */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {isLoadingFriends ? (
                  <div className="py-6 text-center text-zinc-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-500 mx-auto mb-1" />
                    <span>Loading circle...</span>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="py-6 text-center text-zinc-500 text-xs">
                    No friends found in your circle yet.
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = selectedFriend?.id === friend.id;
                    return (
                      <div
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#260616] border-rose-500 shadow-md shadow-rose-950/60 ring-1 ring-rose-500/80'
                            : 'bg-[#0d0207] border-rose-950/70 hover:border-rose-900/60 hover:bg-[#15040d]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-700 to-pink-600 flex items-center justify-center font-bold text-white text-xs">
                              {friend.fullName[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#18040d]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white">
                                {friend.fullName}
                              </h4>
                              {friend.isVolunteer && (
                                <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 rounded-full">
                                  Volunteer
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400 inline" /> Verified Resident
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Discoverable Verified Residents */}
              {discoverableUsers.length > 0 && (
                <div className="pt-3 border-t border-rose-950/50 space-y-2">
                  <span className="text-[11px] uppercase font-bold text-zinc-400 block px-1">
                    Discover Verified Residents
                  </span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {discoverableUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-2.5 rounded-xl bg-[#0d0207] border border-rose-950/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="text-white block leading-tight">{user.fullName}</strong>
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400 inline" /> Verified Resident
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddFriend(user.id)}
                          className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Direct Messaging Window (7 cols) */}
            <div className="lg:col-span-7 bg-[#18040d] border border-rose-950/60 p-5 rounded-3xl shadow-xl flex flex-col h-[610px] justify-between space-y-4">
              {selectedFriend ? (
                <>
                  {/* Friend Chat Header */}
                  <div className="pb-3 border-b border-rose-950/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                          {selectedFriend.fullName[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#18040d]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">
                            {selectedFriend.fullName}
                          </h3>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.2 rounded-full">
                            ● Verified Guardian
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400 inline" /> Verified Circle Member • End-to-End Authenticated
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Direct Messages Stream */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                    {directMessages.length === 0 ? (
                      <div className="py-20 text-center text-zinc-500 text-xs border border-dashed border-rose-950/60 rounded-2xl p-6">
                        <MessageSquare className="w-6 h-6 text-rose-500/40 mx-auto mb-1" />
                        <span>No messages yet with {selectedFriend.fullName}. Send a secure hello!</span>
                      </div>
                    ) : (
                      directMessages.map((msg) => {
                        const isMe = msg.senderId === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-950/50'
                                  : 'bg-[#1a0512] border border-rose-950/80 text-zinc-200'
                              }`}
                            >
                              <p>{msg.message}</p>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 mt-1 px-1">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={dmEndRef} />
                  </div>

                  {/* Direct Message Input */}
                  <form onSubmit={handleSendDirectMessage} className="pt-2 border-t border-rose-950/50 flex gap-2">
                    <input
                      type="text"
                      value={dmInputMessage}
                      onChange={(e) => setDmInputMessage(e.target.value)}
                      placeholder={`Direct message to ${selectedFriend.fullName}...`}
                      disabled={isSendingDm}
                      className="flex-1 bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSendingDm || !dmInputMessage.trim()}
                      className="py-3 px-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-950/50 disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="m-auto text-center text-zinc-500 text-xs">
                  Select a verified friend from your circle to start chatting.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Volunteer Host a Room */}
        {isHostModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isCreatingRoom) setIsHostModalOpen(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-3xl border border-rose-950/70 bg-[#16040c] p-6 shadow-2xl text-zinc-100 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-950/60 border border-rose-900/60 rounded-2xl text-rose-400">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-rose-400 bg-rose-950/40 border border-rose-900/40 rounded-full px-3 py-0.5 text-xs font-semibold inline-block mb-1">
                      Volunteer Cohort
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      Host a Support Space
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsHostModalOpen(false)}
                  disabled={isCreatingRoom}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-rose-950/50 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isVerified ? (
                <div className="p-5 rounded-2xl border border-amber-900/60 bg-amber-950/30 text-center space-y-3">
                  <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-bold text-amber-200">
                    Citizen Verification Required to Volunteer &amp; Launch Rooms
                  </h4>
                  <p className="text-xs text-zinc-400">
                    To maintain trusted peer environments, only Aadhaar-verified residents can host safe spaces.
                  </p>
                  <button
                    onClick={() => {
                      setIsHostModalOpen(false);
                      router.push('/login');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>Complete Identity Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleHostRoom} className="space-y-4">
                  {hostRoomError && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
                      {hostRoomError}
                    </div>
                  )}

                  {/* Room Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase">
                      Room Title
                    </label>
                    <input
                      type="text"
                      value={newRoomTitle}
                      onChange={(e) => setNewRoomTitle(e.target.value)}
                      placeholder="e.g. Yellow Line Metro Walkers (8:30 PM)"
                      required
                      className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  {/* Topic Pill Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase">
                      Support Topic
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ROOM_TOPIC_PILLS.map((topic) => {
                        const isSelected = newRoomTopic === topic;
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setNewRoomTopic(topic)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-400'
                                : 'bg-[#0d0207] text-zinc-400 border-rose-950/70 hover:border-rose-900/60'
                            }`}
                          >
                            {topic}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase">
                      Description &amp; Route Corridor
                    </label>
                    <textarea
                      value={newRoomDesc}
                      onChange={(e) => setNewRoomDesc(e.target.value)}
                      placeholder="Mention meetup timing, station gates, or transit checkpoints..."
                      rows={2}
                      className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingRoom || !newRoomTitle.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-950/50 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  >
                    {isCreatingRoom ? 'Launching Space...' : 'Open Verified Safe Space'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Active Support Room Chat Drawer / Modal */}
        {activeRoom && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 md:p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-2xl rounded-3xl border border-rose-950/80 bg-[#16040c] p-4 md:p-6 shadow-2xl text-zinc-100 flex flex-col h-[85vh] justify-between space-y-4">
              {/* Room Header */}
              <div className="flex items-start justify-between pb-3 border-b border-rose-950/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ● Active Safe Space
                    </span>
                    <span className="text-xs font-mono text-rose-300 bg-rose-950/60 border border-rose-900/50 px-2 py-0.5 rounded-full">
                      {activeRoom.topic}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {activeRoom.title}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Hosted by {activeRoom.creator?.fullName || 'Verified Volunteer'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveRoom(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-rose-950/60"
                  aria-label="Close room"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Room Messages Feed */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {roomMessages.length === 0 ? (
                  <div className="py-20 text-center text-zinc-500 text-xs border border-dashed border-rose-950/60 rounded-2xl p-6">
                    <Radio className="w-8 h-8 text-rose-500/40 mx-auto mb-2" />
                    <span>Safe space opened. Post a message to coordinate with group members!</span>
                  </div>
                ) : (
                  roomMessages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1 px-1">
                          <strong className={isMe ? 'text-rose-300' : 'text-zinc-200'}>
                            {msg.sender?.fullName || (isMe ? 'You' : 'Member')}
                          </strong>
                          {msg.sender?.isVolunteer && (
                            <span className="text-[9px] text-emerald-400 bg-emerald-950/70 border border-emerald-900 px-1.5 rounded-full">
                              Host
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-zinc-500">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-950/50'
                              : 'bg-[#0e0208] border border-rose-950/80 text-zinc-200'
                          }`}
                        >
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={roomMessagesEndRef} />
              </div>

              {/* Room Message Input */}
              <form onSubmit={handleSendRoomMessage} className="pt-2 border-t border-rose-950/60 flex gap-2">
                <input
                  type="text"
                  value={roomInputMessage}
                  onChange={(e) => setRoomInputMessage(e.target.value)}
                  placeholder="Type message in safe space..."
                  disabled={isSendingRoomMsg}
                  className="flex-1 bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSendingRoomMsg || !roomInputMessage.trim()}
                  className="py-3 px-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-950/50 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
