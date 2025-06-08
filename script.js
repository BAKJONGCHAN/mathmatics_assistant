// DOM이 완전히 로드된 후 스크립트 실행
window.addEventListener('DOMContentLoaded', () => {

    // --- DOM 요소 가져오기 ---
    // 교사 제어판
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

    // 학생 작업 공간
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
        // API 키 로드
        API_KEY = localStorage.getItem('gemini-api-key') || '';
        apiKeyInput.value = API_KEY;
        // 교사 프롬프트 로드
        teacherPrompt.value = localStorage.getItem('teacher-prompt') || '';
        // 온도 로드
        const savedTemp = localStorage.getItem('temperature') || '0.3';
        temperatureSlider.value = savedTemp;
        temperatureValue.textContent = savedTemp;
    }

    // --- 이벤트 리스너 설정 ---
    function setupEventListeners() {
        // 교사 컨트롤
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

        // 학생 컨트롤
        startSolvingBtn.addEventListener('click', startTutoringSession);
        sendStudentMsgBtn.addEventListener('click', sendStudentMessage);
        studentQuestionInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                sendStudentMessage();
            }
        });
    }

    // --- 메인 기능 함수 ---
    async function startTutoringSession() {
        if (!API_KEY) {
            alert('교사 제어판에서 API 키를 먼저 저장해주세요.');
            return;
        }
        const studentFile = studentProblemUploader.files[0];
        if (!studentFile) {
            alert('학생의 문제 파일을 업로드해주세요.');
            return;
        }

        setLoadingState(true);
        conversationHistory = []; // 새 세션 시작, 대화 기록 초기화
        chatHistory.innerHTML = '';

        try {
            // 1. OCR로 문제 텍스트 추출 (Gemini 1.5 Pro)
            const problemText = await ocrChef(studentFile);
            displayMessage(`(AI가 읽은 문제: ${problemText})`, 'system');

            // 2. 튜터링 시작 프롬프트 구성
            let initialPrompt = `당신은 초등학생을 위한 소크라테스식 AI 수학 튜터입니다. 당신의 목표는 학생이 스스로 답을 찾도록 안내하는 것입니다. 절대로 최종 정답을 직접 알려주지 마세요. 대신, 한 번에 하나의 힌트나 다음 단계를 생각하게 하는 질문을 던지세요.

학생이 풀 문제는 다음과 같습니다: "${problemText}"

[교사 요청사항]: ${localStorage.getItem('teacher-prompt') || '특별한 요청 없음. 친절하게 안내해주세요.'}

이제 학생에게 첫 번째 힌트나 질문을 던지며 튜터링을 시작해주세요.`;

            // 3. AI에게 첫 안내 요청
            const firstHint = await guidanceChef(initialPrompt, []);
            displayMessage(firstHint, 'ai');

            conversationArea.classList.remove('hidden');

        } catch (error) {
            console.error("튜터링 시작 오류:", error); 
            const friendlyErrorMessage = `오류가 발생했습니다! AI 튜터를 부를 수 없어요. 😢
            
[에러 내용]: ${error.message}

아래 사항을 확인해주세요:
1. 교사 제어판의 API 키가 정확한가요? (앞뒤 공백 주의!)
2. 인터넷 연결이 안정적인가요?
3. (드물게) API 키에 대한 권한 설정 문제일 수 있습니다.`;
            
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
            // AI에게 후속 질문/답변 요청
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
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // --- API 호출 함수 (셰프들) ---
    async function ocrChef(file) {
        // OCR 역할: 이미지/PDF 분석에 최적화된 Gemini 1.5 Pro 사용
        const model = 'gemini-1.5-pro-latest';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
        
        const base64Data = await fileToBase64(file);
        const requestBody = {
            "contents": [{
                "parts": [
                    { "text": "이 이미지에서 수학 문제와 관련된 텍스트만 정확하게 추출해줘. 다른 설명은 붙이지 마." },
                    { "inline_data": { "mime_type": file.type, "data": base64Data } }
                ]
            }]
        };

        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`HTTP 에러! 상태: ${response.status} - ${errorBody.error.message}`);
        }
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('API로부터 유효한 응답을 받지 못했습니다. 입력 파일이나 설정을 확인해주세요.');
        }
        return data.candidates[0].content.parts[0].text.trim();
    }
    
    async function guidanceChef(newPromptText, history) {
        // ==================== [수정된 부분] ====================
        // 튜터링 역할: 복잡한 추론과 대화에 가장 강력한 Gemini 1.5 Pro를 사용합니다.
        // 이를 통해 AI 튜터의 문제 해결 능력과 대화 품질을 극대화합니다.
        const model = 'gemini-1.5-pro-latest';
        // =======================================================
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
        
        const newContents = [...history, { "role": "user", "parts": [{ "text": newPromptText }] }];

        const requestBody = {
            "contents": newContents,
            "generationConfig": {
                "temperature": parseFloat(localStorage.getItem('temperature') || '0.3')
            }
        };

        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`HTTP 에러! 상태: ${response.status} - ${errorBody.error.message}`);
        }
        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('API로부터 유효한 응답을 받지 못했습니다. 입력 파일이나 설정을 확인해주세요.');
        }
        const aiResponsePart = data.candidates[0].content;
        
        conversationHistory = [...newContents, aiResponsePart];

        return aiResponsePart.parts[0].text;
    }

    // 파일을 Base64로 변환하는 유틸리티 함수
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