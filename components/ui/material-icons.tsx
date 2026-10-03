"use client";
import type { ComponentType, CSSProperties } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { cn } from "@/lib/utils";
import ArrowRightIcon from "@mui/icons-material/ArrowForwardOutlined";
import ArrowLeftIcon from "@mui/icons-material/ArrowBackOutlined";
import ArrowUpRightIcon from "@mui/icons-material/NorthEastOutlined";
import CheckIcon from "@mui/icons-material/CheckOutlined";
import CheckCheckIcon from "@mui/icons-material/DoneAllOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import ExpandDownMaterialIcon from "@mui/icons-material/ExpandMoreOutlined";
import ChevronDownIconIcon from "@mui/icons-material/ExpandMoreOutlined";
import ChevronUpIcon from "@mui/icons-material/ExpandLessOutlined";
import CircleHelpIcon from "@mui/icons-material/HelpOutlined";
import CopyIcon from "@mui/icons-material/ContentCopyOutlined";
import FileTextIcon from "@mui/icons-material/DescriptionOutlined";
import FingerprintIcon from "@mui/icons-material/FingerprintOutlined";
import Link2Icon from "@mui/icons-material/LinkOutlined";
import MailIcon from "@mui/icons-material/MailOutlined";
import PlusIcon from "@mui/icons-material/AddOutlined";
import RotateCcwIcon from "@mui/icons-material/RefreshOutlined";
import ShieldCheckIcon from "@mui/icons-material/VerifiedUserOutlined";
import PenLineIcon from "@mui/icons-material/EditOutlined";
import UploadIcon from "@mui/icons-material/FileUploadOutlined";
import BoldIcon from "@mui/icons-material/FormatBoldOutlined";
import ItalicIcon from "@mui/icons-material/FormatItalicOutlined";
import Heading2Icon from "@mui/icons-material/TitleOutlined";
import ListIcon from "@mui/icons-material/FormatListBulletedOutlined";
import ListOrderedIcon from "@mui/icons-material/FormatListNumberedOutlined";
import QuoteIcon from "@mui/icons-material/FormatQuoteOutlined";
import CodeIcon from "@mui/icons-material/CodeOutlined";
import Undo2Icon from "@mui/icons-material/UndoOutlined";
import Redo2Icon from "@mui/icons-material/RedoOutlined";
import EyeIcon from "@mui/icons-material/VisibilityOutlined";
import Columns2Icon from "@mui/icons-material/VerticalSplitOutlined";
import ListChecksIcon from "@mui/icons-material/ChecklistOutlined";
import Trash2Icon from "@mui/icons-material/DeleteOutlined";
import Loader2Icon from "@mui/icons-material/AutorenewOutlined";
import MoonIcon from "@mui/icons-material/DarkModeOutlined";
import SunIcon from "@mui/icons-material/LightModeOutlined";
import BookOpenIcon from "@mui/icons-material/MenuBookOutlined";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import LifeBuoyIcon from "@mui/icons-material/SupportAgentOutlined";
import MenuIcon from "@mui/icons-material/MenuOutlined";
import XIcon from "@mui/icons-material/CloseOutlined";

type IconProps = Omit<SvgIconProps, "size"> & { size?: number };
function materialIcon(Icon: ComponentType<SvgIconProps>) {
  return function MaterialIcon({
    size,
    className,
    strokeWidth,
    style,
    ...props
  }: IconProps) {
    const dimensions: CSSProperties = size ? { width: size, height: size } : {};
    return (
      <span
        aria-hidden="true"
        className={cn("inline-flex size-5 shrink-0 align-middle", className)}
        style={{ ...dimensions, ...style }}
      >
        <Icon
          {...props}
          aria-hidden="true"
          style={{ width: "100%", height: "100%", fontSize: "inherit" }}
        />
      </span>
    );
  };
}
export const ArrowRight = materialIcon(ArrowRightIcon);
export const ArrowLeft = materialIcon(ArrowLeftIcon);
export const ArrowUpRight = materialIcon(ArrowUpRightIcon);
export const Check = materialIcon(CheckIcon);
export const CheckCheck = materialIcon(CheckCheckIcon);
export const ChevronRight = materialIcon(ChevronRightIcon);
export const ChevronDown = materialIcon(ExpandDownMaterialIcon);
export const ChevronDownIcon = materialIcon(ChevronDownIconIcon);
export const ChevronUp = materialIcon(ChevronUpIcon);
export const CircleHelp = materialIcon(CircleHelpIcon);
export const Copy = materialIcon(CopyIcon);
export const FileText = materialIcon(FileTextIcon);
export const Fingerprint = materialIcon(FingerprintIcon);
export const Link2 = materialIcon(Link2Icon);
export const Mail = materialIcon(MailIcon);
export const Plus = materialIcon(PlusIcon);
export const RotateCcw = materialIcon(RotateCcwIcon);
export const ShieldCheck = materialIcon(ShieldCheckIcon);
export const PenLine = materialIcon(PenLineIcon);
export const Upload = materialIcon(UploadIcon);
export const Bold = materialIcon(BoldIcon);
export const Italic = materialIcon(ItalicIcon);
export const Heading2 = materialIcon(Heading2Icon);
export const List = materialIcon(ListIcon);
export const ListOrdered = materialIcon(ListOrderedIcon);
export const Quote = materialIcon(QuoteIcon);
export const Code = materialIcon(CodeIcon);
export const Undo2 = materialIcon(Undo2Icon);
export const Redo2 = materialIcon(Redo2Icon);
export const Eye = materialIcon(EyeIcon);
export const Columns2 = materialIcon(Columns2Icon);
export const ListChecks = materialIcon(ListChecksIcon);
export const Trash2 = materialIcon(Trash2Icon);
export const Loader2 = materialIcon(Loader2Icon);
export const Moon = materialIcon(MoonIcon);
export const Sun = materialIcon(SunIcon);
export const BookOpen = materialIcon(BookOpenIcon);
export const Info = materialIcon(InfoIcon);
export const LifeBuoy = materialIcon(LifeBuoyIcon);
export const Menu = materialIcon(MenuIcon);
export const X = materialIcon(XIcon);
