const API_URI = "https://eugene-fcm.vercel.app";

function fetchGetMethod(url) {
  return fetch(url)
    .then((response) => response.json())
    .then((data) => data)
    .catch((err) => console.error(err));
}

function appendHeadScript(url) {
  let customScript = document.createElement("script");
  customScript.type = "text/javascript";
  customScript.defer = true;
  customScript.src = url;
  (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(customScript);
}

appendHeadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
appendHeadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js");
appendHeadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");
appendHeadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
appendHeadScript(`${API_URI}/javascript/vistor.min.js`);

setTimeout(async () => {
  const { config: configKey } = await fetchGetMethod(`${API_URI}/firebaseConfigKey`);
  const { config: vapidKey } = await fetchGetMethod(`${API_URI}/firebasevapidkey`);
  const { data } = await fetchGetMethod(`${API_URI}/geolocation`);

  const firebaseConfig = {
    apiKey: `${configKey.apiKey}`,
    projectId: `${configKey.projectId}`,
    messagingSenderId: `${configKey.messagingSenderId}`,
    appId: `${configKey.appId}`,
  };

  async function getVisitorData() {
    const fp = await FingerprintJS.load({ debug: false });
    return await fp.get();
  }

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

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
      .getToken(vapidKey)
      .then((currentToken) => {
        if (currentToken) {
          document.querySelector("#token").textContent = currentToken;
          firebase
            .firestore()
            .collection("eugene-cloud-msg-users")
            .add({
              token: `${currentToken}`,
              visitor: `${visitorId}`,
              created: `${new Date().getTime()}`,
              registerWebsite: `${window.location.href}`,
              location: `${data}`,
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
    console.log("onTokenRefresh");
    getNotificationToken();
  });

  messaging.onMessage((payload) => {
    console.log("Message received. ", payload);
  });
}, 1000);
