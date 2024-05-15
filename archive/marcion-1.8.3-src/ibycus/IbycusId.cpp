#include "IbycusId.h"

__IBYCUS_BEGIN_NAMESPACE

IbycusId::IbycusId(const IbycusId & rhs,  const ibyIdNumber & cit1,
        const ibyIdNumber & cit2, const ibyIdNumber & cit3,
        const ibyIdNumber & cit4, const ibyIdNumber & cit5) : Flag_(rhs.Flag_),
                AuthDesc_(rhs.AuthDesc_), WorkDesc_(rhs.WorkDesc_), Ids_(rhs.Ids_)
{

        if(!cit5.IsNull()) {
                insert('z', cit5);
                insert('y', cit4);
                insert('x', cit3);
                insert('w', cit2);
                insert('v', cit1);
        } else if (!cit4.IsNull()) {
                insert('z', cit4);
                insert('y', cit3);
                insert('x', cit2);
                insert('w', cit1);
        } else if (!cit3.IsNull()) {
                insert('z', cit3);
                insert('y', cit2);
                insert('x', cit1);
        } else if (!cit2.IsNull()) {
                insert('z', cit2);
                insert('y', cit1);
        } else if (!cit1.IsNull()) {
                insert('z', cit1);
        }


}

void IbycusId::Read(istream & src, const IbycusId & prev) {

        Ids_ = prev.Ids_;

        bool keepon = true;
        unsigned char ch;
        unsigned char level_byte;
        ibychar_t level;
        ibyIdNumber blanknum;

        bool is_descrip = false;
        ch = src.get();
        while ((ch & HIGHBIT) && keepon) {
                is_descrip = false;
                switch (left_nibble(ch)) {
                case IDX_LN_ESC:
                        switch(level_byte = src.get() & LOWBITS) {
                        case LV_A:
                                level = 'a';
                                break;
                        case LV_B:
                                level = 'b';
                                break;
                        case LV_C:
                                level = 'c';
                                break;
                        case LV_D:
                                level = 'd';
                                break;
                        default:
                                if ('a' <= level_byte && 'z' >= level_byte) {
                                        is_descrip = true;
                                } else {
                                        char tmp[50];
                                        sprintf(tmp, "Unhandled code (%X) in id", ch);
                                        throw IbycusParseException(tmp, src.tellg());
                                }
                        }

                        if (is_descrip)
                                Descrip_[level_byte] = ibyIdNumber(src, ch, blanknum);
                        else
                                insert(level, ibyIdNumber(src, ch, Ids_[level]));
                        break;
                case IDX_LN_SPEC:
                        switch(right_nibble(ch)) {
                        case rn_eof:
                                Flag_ = ENDOFFILE;
                                break;
                        case rn_eob:
                                Flag_ = ENDOFBLOCK;
                                break;
                        case rn_ex_start:
                                Flag_ = EXCEPTION_START;
                                break;
                        case rn_ex_end:
                                Flag_ = EXCEPTION_END;
                                break;
                        default:
                                char tmp[50];
                                sprintf(tmp, "Unhandled code (%X) in id", ch);
                                throw IbycusParseException(tmp, src.tellg());
                        }
                        keepon = false;
                        break;
                default:
                        switch (left_nibble(ch)) { // & 0x7
                        case LN_Z:
                                level = 'z';
                                break;
                        case LN_Y:
                                level = 'y';
                                break;
                        case LN_X:
                                level = 'x';
                                break;
                        case LN_W:
                                level = 'w';
                                break;
                        case LN_V:
                                level = 'v';
                                break;
                        case LN_N:
                                level = 'n';
                                break;
                        default:
                                char tmp[50];
                                sprintf(tmp, "Unhandled code (%X) in id", ch);
                                throw IbycusParseException(tmp, src.tellg());
                        }

                        // TODO: pass LN_Z, etc. to ibyIdNumber instead of setting level
                        //       get rid of switch statement

                        try {
                                insert(level, ibyIdNumber(src, ch, Ids_[level]));
                        } catch (...) {
                                throw IbycusParseException("Error inserting ID", src.tellg());
                        }
                }

                // basic_ifstream bug?
                // src >> ch causes the stream to get out of sync
                ch = src.get();
        }
        src.putback(ch);
}

ibystring_t IbycusId::ToString(const int fmt, const IbycusId * prev) const
{
        ibystring_t retval = "";
        IDMAP::key_type k = 'a';
        if (fmt & fmt_auth)
                k = 'a';
        else if (fmt & fmt_work)
                k = 'b';
        else if (fmt & fmt_section)
                k = 'e';

        IDMAP::const_iterator i = Ids_.lower_bound(k);

        if ((fmt & fmt_diff) && prev != NULL)
                i = mismatch(Ids_.lower_bound(k), Ids_.end(),
                        prev->Ids_.lower_bound(k)).first;

        while (i != Ids_.end()) {
                switch((*i).first) {
                case 'a':
                        if (fmt & fmt_auth) {
                                retval += (fmt & fmt_numbers)
                                        ? (*i).second.ToString() : AuthDesc_.ToString();
                        }
                        break;

                case 'b':
                        if (fmt & (fmt_work|fmt_auth)) {
                                retval += retval.empty() ? "" : ".";
                                retval += (fmt & fmt_numbers)
                                        ? (*i).second.ToString() : WorkDesc_.ToString();
                        }
                        break;

                default:
                        retval += retval.empty() ? "" : ".";
                        retval += (*i).second.ToString();
                }
                i++;
        }

        return retval;
}

void IbycusId::insert(ibychar_t level, const ibyIdNumber & p_id)
{
        assert(level <= 'd' || level == 'n' || level >= 'v');


        // insert the id

        if (level == 'c') {
                WorkDesc_ = p_id;
                Ids_.erase(level);
        } else if (level == 'd') {
                AuthDesc_ = p_id;
                Ids_.erase(level);
        } else {
                Ids_[level] = p_id;
                if (level <= 'b') {
                        Ids_.erase(++(Ids_.find(level)), Ids_.end());
                } else if (level == 'n') {
                        Ids_.erase(++(Ids_.find(level)), Ids_.end());
                } else if (level >= 'v') {
                        // set lower levels to 1
                        ibychar_t j;
                        for (j = ++level; j <= 'z'; j++)
                                Ids_[j] = 1; //ibyIdNumber(1);
                }
        }
}

ibystring_t IbycusId::Id(ibychar_t level) const
{
        IDMAP::const_iterator i;
        if ((i = Ids_.find(level)) != Ids_.end())
                return (*i).second.ToString();
        else {
                char tmp[50];
                sprintf(tmp, "No level %c in ID", level);
                throw IbycusException(tmp);
        }

        return "";
}

IbycusId & IbycusId::operator=(const IbycusId & rhs)
{
        Flag_ = rhs.Flag_;
        AuthDesc_ = rhs.AuthDesc_;
        WorkDesc_ = rhs.WorkDesc_;
        Ids_ = rhs.Ids_;
        return *this;
}

void IbycusId::Clear()
{
        Flag_ = NOFLAG;
        AuthDesc_.Clear();
        WorkDesc_.Clear();
        Ids_.clear();
        Descrip_.clear();
}

bool IbycusId::SameAs(const IbycusId & rhs, const comp_level & cl) const
{
        cout << "SameAs: " << ToString() << " : " << rhs << "\n";
        IDMAP::key_type k;
        if (cl == cl_auth)
                k ='a';
        else if (cl == cl_work)
                k = 'b';
        else
                k = (*Ids_.upper_bound('b')).first;

        return equal(Ids_.begin(), Ids_.upper_bound(k), rhs.Ids_.begin());
}

bool IbycusId::IsNull(const comp_level & cl) const
{
        IDMAP::key_type k;
        if (cl == cl_auth)
                k ='a';
        else if (cl == cl_work)
                k = 'b';
        else
                k = (*Ids_.upper_bound('b')).first;

        return Ids_.empty();
};


bool IbycusId::IsTitle() const
{
        IDMAP::const_iterator i;
        if((i = Ids_.find('b')) != Ids_.end()) {
                while (++i != Ids_.end()) {
                        if ((*i).second.IsTitle())
                                return true;
                }
        }

        return false;
}

ostream & operator<<(ostream & s, const IbycusId & rhs) {
        IDMAP::const_iterator i;
        for (i = rhs.Ids_.begin(); i != rhs.Ids_.end(); ++i) {
                if (!(*i).second.IsNull()) {
                        if (i != rhs.Ids_.begin())
                                s << '.';
                        s << (*i).second;
                }
        }
        return s;
}

__IBYCUS_END_NAMESPACE
