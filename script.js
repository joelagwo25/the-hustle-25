import { db, storage, auth } from './firebase-config.js';

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline';
        if (document.getElementById('upload-form') && user.email === 'youradmin@email.com') { // Replace with your admin email
            document.getElementById('upload-form').style.display = 'block';
        }
        loadEpisodes(); // Load episodes/comments
    } else {
        loginBtn.style.display = 'inline';
        logoutBtn.style.display = 'none';
        if (document.getElementById('upload-form')) {
            document.getElementById('upload-form').style.display = 'none';
        }
    }
});

// Login/Signup (simple prompt for demo; expand with modal)
loginBtn.addEventListener('click', () => {
    const email = prompt('Email:');
    const password = prompt('Password:');
    const isSignup = confirm('Sign up? (OK) or Login (Cancel)');
    if (isSignup) {
        auth.createUserWithEmailAndPassword(email, password).catch(console.error);
    } else {
        auth.signInWithEmailAndPassword(email, password).catch(console.error);
    }
});

logoutBtn.addEventListener('click', () => auth.signOut());

// Load episodes (for home teasers or full list)
async function loadEpisodes() {
    const episodesRef = db.collection('episodes').orderBy('date', 'desc');
    const snapshot = await episodesRef.get();
    let container;
    if (document.getElementById('latest-episodes')) {
        container = document.getElementById('latest-episodes'); // Home: latest 3
        snapshot.docs.slice(0, 3).forEach(renderEpisode);
    } else if (document.getElementById('episode-container')) {
        container = document.getElementById('episode-container'); // Episodes page: all
        snapshot.docs.forEach(renderEpisode);
    }

    function renderEpisode(doc) {
        const data = doc.data();
        const div = document.createElement('div');
        div.className = 'episode';
        div.innerHTML = `
            <h2>${data.title}</h2>
            <p>${data.description}</p>
            <audio controls src="${data.audioUrl}"></audio>
            <div id="comments-${doc.id}"></div>
            <form id="comment-form-${doc.id}">
                <textarea placeholder="Drop your thoughts..." required></textarea>
                <button type="submit">Comment</button>
            </form>
        `;
        container.appendChild(div);

        // Load comments
        db.collection('episodes').doc(doc.id).collection('comments').orderBy('date').get().then(snap => {
            snap.forEach(commentDoc => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';
                commentDiv.textContent = commentDoc.data().text;
                document.getElementById(`comments-${doc.id}`).appendChild(commentDiv);
            });
        });

        // Add comment
        document.getElementById(`comment-form-${doc.id}`).addEventListener('submit', e => {
            e.preventDefault();
            if (!auth.currentUser) return alert('Login to comment');
            const text = e.target.querySelector('textarea').value;
            db.collection('episodes').doc(doc.id).collection('comments').add({
                userId: auth.currentUser.uid,
                text,
                date: new Date()
            }).then(() => location.reload());
        });
    }
}

// Upload episode (admin)
const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
    uploadForm.addEventListener('submit', e => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const desc = document.getElementById('description').value;
        const audioFile = document.getElementById('audio').files[0];

        const storageRef = storage.ref(`audios/${audioFile.name}`);
        storageRef.put(audioFile).then(snapshot => {
            snapshot.ref.getDownloadURL().then(url => {
                db.collection('episodes').add({
                    title,
                    description: desc,
                    audioUrl: url,
                    date: new Date()
                }).then(() => {
                    alert('Episode uploaded!');
                    location.reload();
                });
            });
        });
    });
}

// Load on pages with episodes
if (document.getElementById('latest-episodes') || document.getElementById('episode-container')) {
    loadEpisodes();
}
