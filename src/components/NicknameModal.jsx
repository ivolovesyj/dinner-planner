import { useState } from 'react';

function NicknameModal({ onSave }) {
    const [name, setName] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-300">
                <h2 className="text-xl font-bold mb-2 text-center">반가워요! 👋</h2>
                <p className="text-gray-500 text-center mb-6">함께 구분할 수 있도록 닉네임을 알려주세요.</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 text-lg mb-4 outline-none transition-colors"
                        placeholder="예: 맛집킬러, 철수"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        시작하기
                    </button>
                </form>
            </div>
        </div>
    );
}

export default NicknameModal;
