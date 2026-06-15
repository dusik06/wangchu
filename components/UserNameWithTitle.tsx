type UserNameWithTitleProps = {
    nickname?: string | null;
    profileImage?: string | null;
    titleName?: string | null;
    titleColor?: string | null;
    size?: "sm" | "md" | "lg";
    showImage?: boolean;
  };
  
  export default function UserNameWithTitle({
    nickname,
    profileImage,
    titleName,
    titleColor,
    size = "md",
    showImage = true,
  }: UserNameWithTitleProps) {
    const imageSize =
      size === "lg" ? "w-24 h-24" : size === "sm" ? "w-8 h-8" : "w-12 h-12";
  
    const nameSize =
      size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg";
  
    const titleSize =
      size === "lg" ? "text-sm" : size === "sm" ? "text-[11px]" : "text-xs";
  
    return (
      <div className="flex items-center gap-3">
        {showImage && (
          <img
            src={profileImage || "/default-profile.png"}
            alt="profile"
            className={`${imageSize} rounded-full object-cover border border-white/10 bg-black/30`}
          />
        )}
  
        <div className="flex items-center gap-2 min-w-0">
          {titleName && (
            <span
              className={`${titleSize} px-2 py-0.5 rounded-full border bg-white/5 font-bold shrink-0`}
              style={{
                color: titleColor || "#facc15",
                borderColor: titleColor || "#facc15",
              }}
            >
              {titleName}
            </span>
          )}
  
          <span className={`${nameSize} font-extrabold truncate`}>
            {nickname || "닉네임 없음"}
          </span>
        </div>
      </div>
    );
  }