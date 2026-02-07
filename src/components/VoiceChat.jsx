import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

const VoiceChat = ({ socket, gameId, players, isMuted }) => {
    const peersRef = useRef({}); // userId -> Peer instance
    const [stream, setStream] = useState(null);
    const streamRef = useRef(null);

    useEffect(() => {
        // Initialize local stream
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(s => {
                setStream(s);
                streamRef.current = s;
                // Apply initial mute state
                s.getAudioTracks().forEach(track => track.enabled = !isMuted);
            })
            .catch(err => console.error("Could not get user media", err));

        // Listen for signals from backend
        socket.on('webrtc-signal', ({ fromId, signal }) => {
            if (peersRef.current[fromId]) {
                peersRef.current[fromId].signal(signal);
            } else {
                // Someone is calling us
                const peer = createPeer(fromId, socket.id, false);
                peersRef.current[fromId] = peer;
                peer.signal(signal);
            }
        });

        socket.on('player-voice-status', ({ playerId, isMuted: playerMuted }) => {
            // Optional: UI feedback for other players' mute status
            console.log(`Player ${playerId} is now ${playerMuted ? 'muted' : 'unmuted'}`);
        });

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            Object.values(peersRef.current).forEach(peer => peer.destroy());
            socket.off('webrtc-signal');
            socket.off('player-voice-status');
        };
    }, []);

    // Sync local mute state to stream
    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(track => track.enabled = !isMuted);
            socket.emit('toggle-voice', { gameId, isMuted });
        }
    }, [isMuted, gameId, socket]);

    // Manage peers when players list changes
    useEffect(() => {
        if (!stream) return;

        const playerIds = Object.keys(players);

        // Remove peers who left
        Object.keys(peersRef.current).forEach(pid => {
            if (!players[pid]) {
                peersRef.current[pid].destroy();
                delete peersRef.current[pid];
            }
        });

        // Add peers for new players
        // In WebRTC, we need a "caller" and "receiver".
        // A simple way is to have users with "lexicographically smaller ID" call "larger IDs".
        playerIds.forEach(pid => {
            if (pid !== socket.id && !peersRef.current[pid]) {
                if (socket.id < pid) {
                    const peer = createPeer(pid, socket.id, true);
                    peersRef.current[pid] = peer;
                }
            }
        });
    }, [players, stream, socket.id]);

    const createPeer = (targetId, callerId, initiator) => {
        const peer = new Peer({
            initiator,
            trickle: false,
            stream: streamRef.current,
        });

        peer.on('signal', signal => {
            socket.emit('webrtc-signal', { gameId, targetId, signal });
        });

        peer.on('stream', remoteStream => {
            // Create audio element for the remote stream
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.play().catch(e => console.error("Remote audio play failed", e));
        });

        peer.on('error', err => console.error("Peer error", err));

        return peer;
    };

    return null; // This component doesn't render UI directly, just handles logic
};

export default VoiceChat;
