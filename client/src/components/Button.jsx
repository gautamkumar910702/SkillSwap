
import { Link } from "react-router-dom";
import "./Button.css";

function Button({
  children,
  type = "button",
  variant = "primary",
  onClick,
  disabled = false,
  className = "",
  to,
}) {
  const buttonClasses = [
    "custom-button",
    `custom-button-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Use a link when the button navigates to another page.
  if (to) {
    return (
      <Link to={to} className={buttonClasses}>
        {children}
      </Link>
    );
  }

  // Otherwise, render a normal button.
  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
