import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { GiftedChat, IMessage, Bubble, Send } from 'react-native-gifted-chat';
import * as ImagePicker from 'expo-image-picker';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  orderBy,
  query,
  onSnapshot
} from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyCimmzD59tCb9Z-zSUYnTd8TKP8_7uaI2s",
  authDomain: "chatreal-8cf8a.firebaseapp.com",
  projectId: "chatreal-8cf8a",
  storageBucket: "chatreal-8cf8a.firebasestorage.app",
  messagingSenderId: "763198894016",
  appId: "1:763198894016:web:f4db34e7a50bc0f268e225",
  measurementId: "G-DMK12B9LMY"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function ChatApp() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);


  useEffect(() => {
    if (!user) return;

    const collectionRef = collection(db, 'chats');
    const q = query(collectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => {
          const data: any = doc.data();
          const created = data.createdAt;
          let createdAtDate: Date = new Date();
          if (created && typeof created.toDate === 'function') {
            // Firestore Timestamp
            createdAtDate = created.toDate();
          } else if (created instanceof Date) {
            createdAtDate = created;
          } else if (typeof created === 'number') {
            createdAtDate = new Date(created);
          }

          return {
            _id: doc.id,
            createdAt: createdAtDate,
            text: data.text,
            user: data.user,
            image: data.image || null,
          };
        })
      );
    });

    return unsubscribe;
  }, [user]);


  const onSend = useCallback(async (messages: IMessage[] = []) => {

    setMessages((previousMessages) => GiftedChat.append(previousMessages, messages));

    const { _id, createdAt, text, user, image } = messages[0];

    try {

      await addDoc(collection(db, 'chats'), {
        _id,

        createdAt: serverTimestamp(),
        text: text || '',
        user,
        image: image || null,
      });
    } catch (error: any) {
      console.error("Lỗi gửi tin nhắn:", error);
      alert("Gửi thất bại! Kiểm tra lại mạng hoặc Rules Firebase. Lỗi: " + error.message);
    }
  }, []);


  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled && result.assets) {
      // Giả lập gửi tin nhắn ảnh
      const uri = result.assets[0].uri;
      const imageMessage: IMessage = {
        _id: Math.random().toString(),
        createdAt: new Date(),
        text: '',
        user: {
          _id: auth?.currentUser?.email || 'guest',
          name: auth?.currentUser?.email || 'User',
        },
        image: uri || undefined,
      };
      onSend([imageMessage]);
    }
  };

  // Custom send button
  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <TouchableOpacity style={styles.sendBtn} onPress={() => props.onSend && props.onSend({ text: props.text.trim() ? props.text : '' }, true)}>
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </Send>
    );
  };

  // Custom bubble styling
  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: { backgroundColor: '#4f46e5' },
        left: { backgroundColor: '#f1f1f1' },
      }}
      textStyle={{
        right: { color: '#fff' },
        left: { color: '#000' },
      }}
    />
  );

  // Xử lý Auth
  const handleAuth = async (type: 'login' | 'signup') => {
    try {
      setAuthError('');
      if (type === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      const msg = error?.message || 'Lỗi xác thực';
      setAuthError(msg);
    }
  };

  // Nút camera
  const renderActions = (props: any) => {
    return (
      <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
        <Text style={{ fontSize: 20 }}>📷</Text>
      </TouchableOpacity>
    );
  };

  // Giao diện Loading
  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  // Giao diện Đăng nhập
  if (!user) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.title}>Chat Realtime</Text>
          <Text style={styles.subtitle}>Nhắn tin nhanh, an toàn</Text>
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              style={[styles.input, { flex: 1 }]}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showBtn}>
              <Text style={styles.showText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAuth('login')}>
            <Text style={styles.btnText}>Đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleAuth('signup')}>
            <Text style={styles.secondaryText}>Tạo tài khoản mới</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Giao diện Chat
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.email ? user.email.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.username}>{user.email}</Text>
              <Text style={styles.status}>🟢 Online</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => signOut(auth)} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <GiftedChat
          messages={messages}
          onSend={(messages) => onSend(messages)}
          user={{ _id: user.email, name: user.email }}
          renderActions={renderActions}
          renderBubble={renderBubble}
          renderSend={renderSend}
          showUserAvatar={true}
          messagesContainerStyle={styles.messagesContainer}
          textInputProps={{ placeholder: 'Nhập tin nhắn...' }}
          alwaysShowSend
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  btnGroup: { marginTop: 10 },

  username: { fontWeight: 'bold', fontSize: 16 },
  status: { color: 'green', fontSize: 12 },
  cameraBtn: {
    marginLeft: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
  /* New UI styles */
  headerContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18
  },
  headerMeta: {
    marginLeft: 10
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  logoutText: {
    color: '#b91c1c',
    fontWeight: '600'
  },
  messagesContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 8,
    flex: 1
  },
  authCard: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'center'
  },
  subtitle: { color: '#6b7280', marginBottom: 12, textAlign: 'center' },
  errorText: { color: '#b91c1c', marginBottom: 8, textAlign: 'center' },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  showBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  showText: { color: '#6b7280', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 10, marginTop: 12 },
  secondaryBtn: { backgroundColor: 'transparent', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondaryText: { color: '#4f46e5', textAlign: 'center', fontWeight: '700' },
});