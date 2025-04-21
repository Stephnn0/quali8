import { useImageLoader } from "app/hooks/useImageLoader";
import image from "app/assets/banii.png";
import Skeleton from "./skeleton";
import "./styles.css";

export default function Dashboardcomponent() {
  const { loaded: bannerLoader } = useImageLoader({ source: image });

  if (!bannerLoader) return <Skeleton />;

  return (
    <div className="banner">
      <img src={image} alt="Banner" className="bannerImage" />
      <div className="content">
        <h1 className="title"></h1>
        <p className="subtitle"> </p>
      </div>
    </div>
  );
}
