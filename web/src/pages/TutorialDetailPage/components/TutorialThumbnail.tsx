interface TutorialThumbnailProps {
    src?:string;
    alt:string;
    className?:string;
}

const TutorialThumbnail = ({src, alt, className} : TutorialThumbnailProps) => {
    if(!src)
        return null;
    return (
        <img
            src={src}
            alt={alt}
            className={className}
        />
    );
}

export default TutorialThumbnail;