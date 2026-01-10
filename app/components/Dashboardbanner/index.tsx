import { useImageLoader } from "app/hooks/useImageLoader";
import image from "app/assets/ready2.png";
import Skeleton from "./skeleton";
import "./styles.css";

import mobileImage from "app/assets/mobile.jpeg";
import { useEffect, useState } from "react";

export default function Dashboardcomponent() {
  const { loaded: bannerLoader } = useImageLoader({ source: image });
  const { loaded: mobileBannerLoader } = useImageLoader({ source: mobileImage });

  // Track if we're on a mobile viewport
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Function to check window width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Only show skeleton if relevant image is not loaded
  if (isMobile && !mobileBannerLoader) return <Skeleton />;
  if (!isMobile && !bannerLoader) return <Skeleton />;

  return (
    <div className="banner">
      {isMobile ? (
        <img src={mobileImage} alt="Banner mobile" className="bannerImage" />
      ) : (
        <img src={image} alt="Banner" className="bannerImage" />
      )}
      <div className="content">
        <h1 className="title"></h1>
        <p className="subtitle"> </p>
      </div>
    </div>
  );
}

