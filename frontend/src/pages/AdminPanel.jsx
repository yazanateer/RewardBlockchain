import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../contractConfig';

export default function AdminPanel() {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);

  // Load existing courses from blockchain
  useEffect(() => {
    const fetchCourses = async () => {
      if (!window.ethereum) return;
      try {
        setLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);

        const totalCourses = await contract.courseCount();
        const fetchedCourses = [];

        for (let i = 1; i <= totalCourses; i++) {
          const [id, cTitle, cDescription, cMilestones] = await contract.getCourse(i);
          fetchedCourses.push({
            id: Number(id),
            title: cTitle,
            description: cDescription,
            milestones: Array.from(cMilestones), // ✅ Convert tuple to array
          });
        }

        setCourses(fetchedCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleMilestoneChange = (index, value) => {
    const updated = [...milestones];
    updated[index] = value;
    setMilestones(updated);
  };

  const handleAddCourse = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is required!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const formattedMilestones = [...milestones];
      while (formattedMilestones.length < 3) {
        formattedMilestones.push("");
      }

      const tx = await contract.createCourse(title, description, formattedMilestones);
      await tx.wait();

      alert("Course successfully created!");

      const total = await contract.courseCount();
      const [id, cTitle, cDescription, cMilestones] = await contract.getCourse(total);

      setCourses([...courses, {
        id: Number(id),
        title: cTitle,
        description: cDescription,
        milestones: Array.from(cMilestones), // ✅ Convert tuple to array
      }]);

      setTitle('');
      setDescription('');
      setMilestones(['', '', '']);
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course");
    }
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
        <textarea
          placeholder="Course description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none"
        />
        {milestones.map((milestone, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Milestone ${String.fromCharCode(65 + i)}`}
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
        {loading ? (
          <p className="text-white/70">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-white/70">No courses yet</p>
        ) : (
          <ul className="space-y-4">
            {courses.map((course) => (
              <li key={course.id} className="p-4 bg-white/5 border border-white/10 rounded shadow-md">
                <h3 className="text-lg font-bold">{course.title}</h3>
                <p className="text-sm text-white/70 mb-2">{course.description}</p>
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
