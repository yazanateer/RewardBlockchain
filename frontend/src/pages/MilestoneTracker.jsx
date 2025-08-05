import { useState } from 'react';

export default function MilestoneTracker() {
  // Placeholder milestones (later fetched from contract)
  const initialMilestones = [
    { id: 1, title: "Milestone A - Watch Intro", completed: false },
    { id: 2, title: "Milestone B - Solve Quiz", completed: false },
    { id: 3, title: "Milestone C - Submit Assignment", completed: false },
  ];

  const [milestones, setMilestones] = useState(initialMilestones);
  const completedCount = milestones.filter(m => m.completed).length;

  const handleComplete = (index) => {
    const updated = [...milestones];
    updated[index].completed = true;
    setMilestones(updated);
  };

  return (
    <div className="min-h-screen text-white px-6 py-12">
      <h2 className="text-4xl font-extrabold mb-10 text-center">Course Progress</h2>

      {/* Progress Bar */}
      <div className="w-full max-w-xl mx-auto mb-12">
        <div className="bg-white/10 rounded-full h-6 overflow-hidden shadow-md">
          <div
            className="bg-blue-500 h-6 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / milestones.length) * 100}%` }}
          />
        </div>
        <p className="text-center mt-2 text-gray-300">{completedCount} / {milestones.length} Milestones Completed</p>
      </div>

      {/* Milestone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {milestones.map((milestone, index) => {
          const isLocked = index > 0 && !milestones[index - 1].completed;

          return (
            <div
              key={milestone.id}
              className={`border rounded-2xl p-6 backdrop-blur-md 
                ${milestone.completed
                  ? "border-green-500/30 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  : isLocked
                  ? "border-gray-500/30 bg-gray-500/10 opacity-50 cursor-not-allowed"
                  : "border-blue-500/30 bg-blue-500/10 shadow-[0_0_20px_rgba(83,109,254,0.3)]"}`}
            >
              <h3 className="text-xl font-bold mb-4">{milestone.title}</h3>
              <button
                disabled={milestone.completed || isLocked}
                onClick={() => handleComplete(index)}
                className={`px-4 py-2 rounded-xl font-semibold transition w-full
                  ${milestone.completed
                    ? "bg-green-600 text-white"
                    : isLocked
                    ? "bg-gray-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-500"}`}
              >
                {milestone.completed ? "Completed" : isLocked ? "Locked" : "Complete Milestone"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Certificate Message */}
      {completedCount === milestones.length && (
        <div className="text-center mt-10 text-green-400 font-semibold text-lg">
          All milestones completed! NFT certificate will be minted automatically.
        </div>
      )}
    </div>
  );
}
