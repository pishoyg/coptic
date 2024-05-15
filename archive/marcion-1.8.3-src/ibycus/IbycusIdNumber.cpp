#include "IbycusIdNumber.h"

__IBYCUS_BEGIN_NAMESPACE

ibystring_t ibyIdNumber::GetAsciiStr(istream & src)
{
        ibystring_t tmp;
        unsigned char ch;

        while((ch = src.get()) != 0xff)
                tmp += low_bits(ch);

        return tmp;
}

ibyIdNumber::ibyIdNumber(istream & src, unsigned char ch, const ibyIdNumber & prev) : binary(0), ascii("")
{
        switch (right_nibble(ch)) {
        case IDX_RN_INC:
                if (prev.ascii.empty()) {
                                binary = prev.binary + 1;
                } else {
                        if (prev.binary != 0) {
                                binary = prev.binary+1;
                        } else {
                                ibystring_t::size_type pos = prev.ascii.find_first_of("0123456789");
                                if (pos == prev.ascii.npos) {
                                        ascii = prev.ascii;
                                        (*(ascii.end()-1))++; // Move the last character up the ladder
                                } else {
                                        ascii = prev.ascii.substr(0,pos);
                                        char numbers[20];
                                        strcpy(numbers, prev.ascii.substr(pos).c_str());
                                        int bin = atoi(numbers);
                                        //itoa(++bin, numbers, 10);
                                        sprintf(numbers, "%d", ++bin);

                                        ascii += numbers;
                                }
                        }
                }
                break;
        case IDX_RN_7BIT:
                binary = src.get() & LOWBITS;
                break;
        case IDX_RN_7BIT_CH:
                binary = src.get() & LOWBITS;
                ascii  = src.get() & LOWBITS;
                break;
        case IDX_RN_7BIT_STR:
                binary = src.get() & LOWBITS;
                ascii = GetAsciiStr(src);
                break;
        case IDX_RN_14BIT:
                binary = ((src.get() & LOWBITS) << 7) + (src.get() & LOWBITS);
                break;
        case IDX_RN_14BIT_CH:
                binary = ((src.get() & LOWBITS) << 7) + (src.get() & LOWBITS);
                ascii  = src.get() & LOWBITS;
                break;
        case IDX_RN_14BIT_STR:
                binary = ((src.get() & LOWBITS) << 7) + (src.get() & LOWBITS);
                ascii = GetAsciiStr(src);
                break;
        case IDX_RN_NEW_CH:
                binary = prev.binary;
                ascii  = src.get() & LOWBITS;
                break;
        case IDX_RN_STR:
                ascii = GetAsciiStr(src);
                break;
        default:
                binary = right_nibble(ch);
        }
}

ibystring_t ibyIdNumber::ToString() const
{
        ibystring_t retval;
        if (binary != 0) {
                char tmp[15];
                sprintf(tmp, "%d", binary);
                retval += tmp;
        }

        if (!ascii.empty())
                retval += ascii;
        return retval;
}

ibystring_t * ibyIdNumber::ToString(ibystring_t * dest)
{
        *dest = "";
        if (binary != 0) {
                char tmp[15];
                sprintf(tmp, "%d", binary);
                *dest += tmp;
        }

        if (!ascii.empty())
                *dest += ascii;
        return dest;
}

bool ibyIdNumber::operator<(const ibyIdNumber & rhs) const
{
        if (IsTitle() && !rhs.IsTitle()) {
                return true;
        }

        return binary < rhs.binary |
                        (binary == rhs.binary && ascii < rhs.ascii);
}

ostream & operator<<(ostream & s, const ibyIdNumber & rhs) {
        if (rhs.binary != 0)
                s << rhs.binary;
        s << rhs.ascii;
        return s;
}

__IBYCUS_END_NAMESPACE
