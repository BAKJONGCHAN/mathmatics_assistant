// DOM이 완전히 로드된 후 스크립트 실행
window.addEventListener('DOMContentLoaded', () => {

    // --- DOM 요소 가져오기 ---
    const homeBtn = document.getElementById('home-btn');
    const loginScreen = document.getElementById('login-screen');
    const loginTeacherBtn = document.getElementById('login-teacher-btn');
    const loginStudentBtn = document.getElementById('login-student-btn');

    const mainContainer = document.getElementById('main-container');

    const teacherPanel = document.getElementById('teacher-panel');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const deleteApiKeyBtn = document.getElementById('delete-api-key-btn');
    const teacherPrompt = document.getElementById('teacher-prompt');
    const savePromptBtn = document.getElementById('save-prompt-btn');
    const deletePromptBtn = document.getElementById('delete-prompt-btn');
    const temperatureSlider = document.getElementById('temperature-slider');
    const temperatureValue = document.getElementById('temperature-value');
    const saveTemperatureBtn = document.getElementById('save-temperature-btn');
    const teacherExampleUploader = document.getElementById('teacher-example-uploader');
    const exampleFileName = document.getElementById('example-file-name');
    const deleteExampleBtn = document.getElementById('delete-example-btn');

    const studentPanel = document.getElementById('student-panel');
    const studentProblemUploader = document.getElementById('student-problem-uploader');
    const startSolvingBtn = document.getElementById('start-solving-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const conversationArea = document.getElementById('conversation-area');
    const chatHistory = document.getElementById('chat-history');
    const studentQuestionInput = document.getElementById('student-question-input');
    const sendStudentMsgBtn = document.getElementById('send-student-msg-btn');

    // --- 전역 변수 ---
    let API_KEY = '';
    let teacherExampleFile = null;
    let conversationHistory = [];

    // --- 초기화 함수 ---
    function initialize() {
        loadSettings();
        setupEventListeners();
    }

    // --- 설정 불러오기 (localStorage 사용) ---
    function loadSettings() {
        API_KEY = localStorage.getItem('gemini-api-key') || '';
        apiKeyInput.value = API_KEY;
        teacherPrompt.value = localStorage.getItem('teacher-prompt') || '특별한 요청 없음. 친절하게 안내해주세요.';
        const savedTemp = localStorage.getItem('temperature') || '0.3';
        temperatureSlider.value = savedTemp;
        temperatureValue.textContent = savedTemp;
    }

    // --- 이벤트 리스너 설정 ---
    function setupEventListeners() {
        homeBtn.addEventListener('click', goToHome);
        loginTeacherBtn.addEventListener('click', handleTeacherLogin);
        loginStudentBtn.addEventListener('click', handleStudentLogin);

        saveApiKeyBtn.addEventListener('click', () => {
            localStorage.setItem('gemini-api-key', apiKeyInput.value);
            API_KEY = apiKeyInput.value;
            alert('API 키가 저장되었습니다.');
        });
        deleteApiKeyBtn.addEventListener('click', () => {
            localStorage.removeItem('gemini-api-key');
            apiKeyInput.value = '';
            API_KEY = '';
            alert('API 키가 삭제되었습니다.');
        });
        savePromptBtn.addEventListener('click', () => {
            localStorage.setItem('teacher-prompt', teacherPrompt.value);
            alert('지도 방향이 저장되었습니다.');
        });
        deletePromptBtn.addEventListener('click', () => {
            localStorage.removeItem('teacher-prompt');
            teacherPrompt.value = '';
            alert('지도 방향이 삭제되었습니다.');
        });
        temperatureSlider.addEventListener('input', () => {
            temperatureValue.textContent = temperatureSlider.value;
        });
        saveTemperatureBtn.addEventListener('click', () => {
            localStorage.setItem('temperature', temperatureSlider.value);
            alert(`온도(${temperatureSlider.value})가 저장되었습니다.`);
        });
        teacherExampleUploader.addEventListener('change', (event) => {
            teacherExampleFile = event.target.files[0];
            exampleFileName.textContent = teacherExampleFile ? teacherExampleFile.name : '선택된 파일 없음';
        });
        deleteExampleBtn.addEventListener('click', () => {
            teacherExampleUploader.value = '';
            teacherExampleFile = null;
            exampleFileName.textContent = '선택된 파일 없음';
        });

        startSolvingBtn.addEventListener('click', startTutoringSession);
        sendStudentMsgBtn.addEventListener('click', sendStudentMessage);
        studentQuestionInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                sendStudentMessage();
            }
        });
    }

    // --- 화면 전환 및 로그인 처리 함수 ---
    function goToHome() {
        mainContainer.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        chatHistory.innerHTML = '';
        conversationArea.classList.add('hidden');
    }

    function handleTeacherLogin() {
        const password = prompt('교사용 비밀번호를 입력하세요:');
        if (password === 'cu123456!') {
            loginScreen.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            studentPanel.classList.add('hidden');
            teacherPanel.classList.remove('hidden');
        } else if (password !== null) {
            alert('비밀번호가 틀렸습니다.');
        }
    }

    function handleStudentLogin() {
        const password = prompt('학생용 비밀번호를 입력하세요:');
        if (password === 'cust123456!') {
            loginScreen.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            teacherPanel.classList.add('hidden');
            studentPanel.classList.remove('hidden');
        } else if (password !== null) {
            alert('비밀번호가 틀렸습니다.');
        }
    }


    // --- 메인 기능 함수 ---
    async function startTutoringSession() {
        if (!API_KEY) {
            alert('교사 제어판에서 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.');
            return;
        }
        const studentFile = studentProblemUploader.files[0];
        if (!studentFile) {
            alert('학생의 문제 파일을 업로드해주세요.');
            return;
        }

        setLoadingState(true);
        conversationHistory = [];
        chatHistory.innerHTML = '';

        try {
            const problemText = await ocrChef(studentFile);
            displayMessage(`(AI가 읽은 문제: ${problemText})`, 'system');

            const initialPrompt = `당신은 고등학생을 위한 AI 수학 튜터입니다. 당신의 목표는 학생이 답을 찾도록 안내하는 것입니다.

            [매우 중요한 규칙]
            1. 모든 답변은 반드시 한국어로 해야 합니다.
            2. 답변은 문장 단위로 줄을 바꾸어(개행하여) 명확하게 제시해주세요. 학생들이 한 번에 한 문장씩 집중해서 읽을 수 있도록 도와줍니다.
            3. 필요시 정답을 알려주세요. 힌트나 다음 단계를 생각하게 하는 질문을 던지세요.
            4. 수학 용어와 기호는 LaTeX 형식($...$)을 사용하여 명확하게 표시해주세요.

            학생이 풀 문제는 다음과 같습니다: "${problemText}"

            [교사 요청사항]: ${localStorage.getItem('teacher-prompt')}

            이제 위의 모든 규칙을 철저히 지키면서, 학생에게 튜터링을 시작해주세요.`;

            const firstHint = await guidanceChef(initialPrompt, []);
            displayMessage(firstHint, 'ai');

            conversationArea.classList.remove('hidden');

        } catch (error) {
            console.error("튜터링 시작 오류:", error);
            const friendlyErrorMessage = `오류가 발생했습니다! AI 튜터를 부를 수 없어요. 😢\n\n[에러 내용]: ${error.message}\n\n인터넷 연결을 확인하거나, 잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의하세요.`;
            displayMessage(friendlyErrorMessage, 'system');
            conversationArea.classList.remove('hidden');
        } finally {
            setLoadingState(false);
        }
    }

    async function sendStudentMessage() {
        const messageText = studentQuestionInput.value.trim();
        if (!messageText) return;

        displayMessage(messageText, 'student');
        studentQuestionInput.value = '';
        setInteractingState(true);

        try {
            const aiResponse = await guidanceChef(messageText, conversationHistory);
            displayMessage(aiResponse, 'ai');
        } catch (error) {
            console.error("메시지 전송 오류:", error);
            displayMessage(`답변을 받는 데 실패했습니다. 다시 시도해주세요. (에러: ${error.message})`, 'system');
        } finally {
            setInteractingState(false);
        }
    }

    // --- UI 상태 관리 함수 ---
    function setLoadingState(isLoading) {
        loadingSpinner.classList.toggle('hidden', !isLoading);
        startSolvingBtn.disabled = isLoading;
        if (isLoading) conversationArea.classList.add('hidden');
    }

    function setInteractingState(isInteracting) {
        studentQuestionInput.disabled = isInteracting;
        sendStudentMsgBtn.disabled = isInteracting;
    }

    function displayMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', `${sender}-message`);
        messageDiv.textContent = text;
        chatHistory.appendChild(messageDiv);

        if (typeof MathJax !== "undefined") {
            MathJax.typesetPromise([messageDiv]).catch(err => console.error("MathJax 렌더링 오류:", err));
        }

        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // --- API 호출 함수 (셰프들) ---
    async function ocrChef(file) {
        const model = 'gemini-2.5-flash-preview-04-17';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

        const ocrPrompt = `당신은 수학 문제 전문 OCR 분석가입니다. 당신의 임무는 그림과 글이 섞인 복잡한 수학 문제 이미지에서 모든 텍스트 정보를 완벽하게 추출하는 것입니다.

        다음의 '단계적 분석' 과정을 반드시 내부적으로 수행하여 정확도를 극대화하세요:
        1.  **[1단계: 영역 분할]** 이미지 전체를 훑어보고, '문제 서술부', '핵심 수식부(예: lim)', '기하 도형부', '단서 조항부'로 시각적 영역을 나눕니다.
        2.  **[2단계: 개별 텍스트 추출]** 각 영역의 텍스트를 하나씩, 매우 신중하게 읽어냅니다. 특히 '기하 도형부' 안에 포함된 작은 글씨나 기호(예: f(θ), g(θ), R, U, T, θ, 2θ 등)를 절대 놓치지 마세요.
        3.  **[3단계: 종합 및 정리]** 1, 2단계에서 추출한 모든 정보를 모아, 논리적인 순서에 따라 하나의 완전한 문제 텍스트로 재구성합니다.

        최종 결과물은 3단계에서 완성된, 깨끗하게 정리된 텍스트만 보여주세요. 당신의 생각 과정(1, 2단계)은 출력하지 마세요.`;

        const base64Data = await fileToBase64(file);
        const requestBody = { "contents": [{ "parts": [{ "text": ocrPrompt }, { "inline_data": { "mime_type": file.type, "data": base64Data } }] }] };

        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`HTTP 에러! 상태: ${response.status} - ${errorBody.error.message}`);
        }
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) { throw new Error('API로부터 유효한 응답을 받지 못했습니다.'); }
        return data.candidates[0].content.parts[0].text.trim();
    }

    async function guidanceChef(newPromptText, history) {
        const model = 'gemini-2.5-flash-preview-04-17';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

        const newContents = [...history, { "role": "user", "parts": [{ "text": newPromptText }] }];

        const requestBody = {
            "contents": newContents,
            "generationConfig": { "temperature": parseFloat(localStorage.getItem('temperature') || '0.3') }
        };

        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`HTTP 에러! 상태: ${response.status} - ${errorBody.error.message}`);
        }
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) { throw new Error('API로부터 유효한 응답을 받지 못했습니다.'); }
        const aiResponsePart = data.candidates[0].content;

        conversationHistory = [...newContents, aiResponsePart];
        return aiResponsePart.parts[0].text;
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    // --- 앱 시작! ---
    initialize();
});