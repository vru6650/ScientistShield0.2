import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, useRef } from 'react';

const TutorialCard = ({ tutorial }) => {
    // Define animation variants for the card's entrance
    const cardVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 10,
            },
        },
    };

    const cardRef = useRef(null);
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const { clientX, clientY } = e;
        const { top, left, width, height } = cardRef.current.getBoundingClientRect();
        mouseX.set((clientX - left) / width);
        mouseY.set((clientY - top) / height);
    };

    const rotateX = useSpring(useTransform(mouseY, [0, 1], [-8, 8]), { stiffness: 250, damping: 15 });
    const rotateY = useSpring(useTransform(mouseX, [0, 1], [8, -8]), { stiffness: 250, damping: 15 });
    const scale = useSpring(isHovering ? 1.05 : 1, { stiffness: 300, damping: 10 });
    const boxShadow = useSpring(useTransform(mouseX, [0, 1],
        ["-10px 10px 20px rgba(0,0,0,0.2)", "10px 10px 20px rgba(0,0,0,0.2)"]
    ), { stiffness: 300, damping: 10 });

    // Estimate reading time based on a ~200 wpm average
    const wordCount = tutorial.content
        ? tutorial.content.replace(/<[^>]+>/g, '').trim().split(/\s+/).length
        : 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
        <Link to={`/tutorials/${tutorial.slug}`} className="block h-full">
            <motion.div
                ref={cardRef}
                className="relative border border-gray-700 rounded-lg shadow-md overflow-hidden h-full flex flex-col bg-gray-800"
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                whileHover={{
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onMouseMove={handleMouseMove}
                style={{
                    rotateX,
                    rotateY,
                    perspective: 1000
                }}
            >
                <div className="relative">
                    <motion.img
                        src={tutorial.thumbnail || 'https://via.placeholder.com/400x250?text=Tutorial+Thumbnail'}
                        alt={tutorial.title}
                        className="w-full h-48 object-cover object-center transition-transform duration-300"
                        initial={{ scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                    />
                    <span className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        {readingTime} min read
                    </span>
                </div>

                <div className="p-4 flex flex-col flex-grow">
                    <h2 className="text-xl font-bold line-clamp-2 text-white mb-2">{tutorial.title}</h2>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-3 flex-grow">{tutorial.description}</p>
                    <div className="mt-4">
                        <span className="inline-block px-3 py-1 bg-teal-600/20 text-teal-300 rounded-full text-xs font-medium uppercase tracking-wide">
                            {tutorial.category}
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
};

export default TutorialCard;