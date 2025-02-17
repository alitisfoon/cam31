Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(() => showSection('recognition'));

function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    if (sectionId === 'recognition') {
        startCamera('recognitionVideo');
    } else if (sectionId === 'add-student') {
        startCamera('addStudentVideo');
    }
}

async function startCamera(videoId) {
    const video = document.getElementById(videoId);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        if (videoId === 'recognitionVideo') {
            video.addEventListener('play', () => {
                const canvas = faceapi.createCanvasFromMedia(video);
                document.getElementById('camera').append(canvas);
                const displaySize = { width: video.width, height: video.height };
                faceapi.matchDimensions(canvas, displaySize);

                setInterval(async () => {
                    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                    faceapi.draw.drawDetections(canvas, resizedDetections);

                    const results = resizedDetections.map(d => faceapi.euclideanDistance(d.descriptor, storedDescriptor) < 0.6);
                    if (results.includes(true)) {
                        document.getElementById('name').textContent = 'نام: شناسایی شد';
                        document.getElementById('status').textContent = 'وضعیت: دانش‌آموز ثبت‌شده';
                    } else {
                        document.getElementById('name').textContent = 'نام: ناشناس';
                        document.getElementById('status').textContent = 'وضعیت: -';
                    }
                }, 100);
            });
        }
    } catch (err) {
        alert('اجازه دسترسی به دوربین داده نشد.');
    }
}

async function takePhoto() {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('addStudentVideo');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const photo = document.getElementById('photo');
    photo.src = canvas.toDataURL('image/png');
    photo.style.display = 'block';
}

async function saveStudent() {
    const name = document.getElementById('studentName').value;
    const father = document.getElementById('studentFather').value;
    const birthYear = document.getElementById('studentBirthYear').value;
    const grade = document.getElementById('studentGrade').value;
    const absences = document.getElementById('studentAbsences').value;
    const photo = document.getElementById('photo').src;

    const table = document.querySelector('#archiveTable tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${name}</td>
        <td>${father}</td>
        <td>${birthYear}</td>
        <td>${grade}</td>
        <td>${absences}</td>
        <td><img src="${photo}" style="width:50px;height:50px;"></td>
        <td><button onclick="this.parentElement.parentElement.remove()">حذف</button></td>
    `;
    table.appendChild(row);

    const image = await faceapi.fetchImage(photo);
    const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
    localStorage.setItem(name, JSON.stringify(detection.descriptor));

    document.getElementById('studentName').value = '';
    document.getElementById('studentFather').value = '';
    document.getElementById('studentBirthYear').value = '';
    document.getElementById('studentGrade').value = '';
    document.getElementById('studentAbsences').value = '';
    document.getElementById('photo').src = '';
}

let storedDescriptor = null;
window.onload = () => {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const descriptor = JSON.parse(localStorage.getItem(key));
        if (descriptor) {
            storedDescriptor = new Float32Array(descriptor);
        }
    }
    showSection('recognition');
};
