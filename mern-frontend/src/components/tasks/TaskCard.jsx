import MyTaskCard from './variants/MyTaskCard.jsx';
import ProjectTaskCard from './variants/ProjectTaskCard.jsx';

export default function TaskCard({ variant = "project", ...props }) {
  console.log("Rendering TaskCard with variant:", variant);
  if (variant === "my") {
    return <MyTaskCard {...props} />;
  }
  return <ProjectTaskCard {...props} />;
}
