import type { PropsWithChildren } from "react";

type ConditionalWrapperProps = PropsWithChildren<{
  condition: boolean;
  wrapper: (children: React.ReactNode) => React.ReactNode;
}>;

/**
 * ConditionalWrapper component
 * Use this component to conditionally wrap children with a wrapper component.
 *
 * @example
 *
 * function Example({ condition }: Props) {
 *   const renderNameOfContainer = (props: PropsWithChildren<ContainerProps>) => <Container {...props} />;
 *
 *   return (
 *     <ConditionalWrapper
 *        condition={condition}
 *        wrapper={(children) => renderNameOfContainer({ propX, children })}
 *     >
 *       <p>content</p>
 *     </ConditionalWrapper>
 *   );
 * }
 *
 * @reference
 * https://github.com/react-navigation/react-navigation/issues/11536#issuecomment-2106088785
 */
const ConditionalWrapper = ({
  condition,
  wrapper,
  children,
}: ConditionalWrapperProps) => (condition ? wrapper(children) : children);

export default ConditionalWrapper;
