import { useState } from 'react';

export default function AdminPanel() {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [milestones, setMilestones] = useState(['', '', '']); // fixed 3 milestones

  const handleMilestoneChange = (index, value) => {
    const updated = [...milestones];
    updated[index] = value;
    setMilestones(updated);
  };

  const handleAddCourse = () => {
    const newCourse = {
      title,
      milestones: milestones.map((m) => m.trim()).filter(Boolean), // ensure no empty milestones
    };
    setCourses([...courses, newCourse]);
    setTitle('');
    setMilestones(['', '', '']); // reset inputs
  };

  return (
    <div className="min-h-screen px-6 py-10 text-white font-sans">
      <h1 className="text-4xl font-bold mb-6">Admin Panel</h1>

      {/* Course Form */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 mb-10 shadow-[0_0_20px_#3b82f6] max-w-xl">
        <h2 className="text-2xl font-semibold mb-4">Add New Course</h2>
        <input
          type="text"
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none"
        />
        {milestones.map((milestone, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Milestone ${String.fromCharCode(65 + i)}`} // A, B, C
            value={milestone}
            onChange={(e) => handleMilestoneChange(i, e.target.value)}
            className="w-full mb-2 px-4 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none"
          />
        ))}
        <button
          onClick={handleAddCourse}
          className="mt-4 px-4 py-2 bg-green-600 rounded hover:bg-green-500 transition"
        >
          Add Course
        </button>
      </div>

      {/* Existing Courses */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Existing Courses</h2>
        {courses.length === 0 ? (
          <p className="text-white/70">No courses yet</p>
        ) : (
          <ul className="space-y-4">
            {courses.map((course, i) => (
              <li key={i} className="p-4 bg-white/5 border border-white/10 rounded shadow-md">
                <h3 className="text-lg font-bold">{course.title}</h3>
                <ul className="list-disc list-inside ml-4 text-white/80">
                  {course.milestones.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
