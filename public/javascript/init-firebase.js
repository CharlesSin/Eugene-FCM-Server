const firebaseConfig = {
  apiKey: "AIzaSyAen2FnXy-gKlxgeHZSgTpr-dAUsD9X7bM",
  authDomain: "eugene-fcm.firebaseapp.com",
  projectId: "eugene-fcm",
  storageBucket: "eugene-fcm.appspot.com",
  messagingSenderId: "909731893166",
  appId: "1:909731893166:web:b18c5a0cdc2fcff00c823f",
  measurementId: "G-R11CEBM1QC",
};

async function getVisitorData() {
  const fp = await FingerprintJS.load({ debug: false });
  return await fp.get();
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

async function getNotificationToken() {
  const { visitorId } = await getVisitorData();
  document.querySelector("#vistor").textContent = visitorId;

  /**
   * Get registration token. Initially this makes a network call, once retrieved
   * subsequent calls to getToken will return from cache.
   */
  messaging
    .getToken({ vapidKey: "BI4vxOcRLneYRWuOhoaXWLTdYmY4xChF_XudMLNyW1wreBM9kE3bdEA66AAiQPRuTvo_otmq37UedZwiiOXwoBA" })
    .then((currentToken) => {
      if (currentToken) {
        document.querySelector("#token").textContent = currentToken;
        db.collection("online-users")
          .add({
            token: `${currentToken}`,
            visitor: `${visitorId}`,
            created: `${new Date().getTime()}`,
          })
          .catch((error) => {
            console.error("Error adding document: ", error);
          });
      } else {
        console.error("No registration token available. Request permission to generate one.");
      }
    })
    .catch((err) => {
      console.error("An error occurred while retrieving token. ", err);
    });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./firebase-messaging-sw.js")
    .then(function (registration) {
      messaging.useServiceWorker(registration);
      messaging
        .requestPermission()
        .then(function () {
          // console.log("Notification permission granted.");
          getNotificationToken();
        })
        .catch(function (err) {
          console.error("Unable to get permission to notify.", err);
        });
    })
    .catch(function (err) {
      console.error("Service worker registration failed, error:", err);
    });
}

messaging.onTokenRefresh(function () {
  // console.log("onTokenRefresh");
  getNotificationToken();
});

messaging.onMessage((payload) => {
  // console.log("Message received. ", payload);
});