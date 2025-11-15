import * as React from "react";
import { Image } from "expo-image";

interface AvatarIconProps {
    id: string;
    size: number;
    square?: boolean;
}

export const AvatarIcon = React.memo((props: AvatarIconProps) => {
    const { size, square } = props;

    return (
        <Image
            source={require('@/assets/images/icon.png')}
            contentFit="cover"
            style={{
                width: size,
                height: size,
                borderRadius: square ? 0 : size / 2
            }}
        />
    );
});
